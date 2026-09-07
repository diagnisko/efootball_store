import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { randomUUID } from "crypto";

const REGION = process.env.AWS_REGION;
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const PUBLIC_BUCKET = process.env.S3_BUCKET_PUBLIC;
const PRIVATE_BUCKET = process.env.S3_BUCKET_PRIVATE;
const PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL; // ex: URL CloudFront devant le bucket public

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      "Stockage cloud non configuré côté serveur. Renseignez AWS_REGION, AWS_ACCESS_KEY_ID, " +
        "AWS_SECRET_ACCESS_KEY, S3_BUCKET_PUBLIC et S3_BUCKET_PRIVATE dans .env."
    );
    this.name = "StorageNotConfiguredError";
  }
}

function getClient(): S3Client {
  if (!REGION || !ACCESS_KEY || !SECRET_KEY) throw new StorageNotConfiguredError();
  return new S3Client({ region: REGION, credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY } });
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const DOCUMENT_TYPES = [...IMAGE_TYPES, "application/pdf"];

const MAX_MEDIA_IMAGE_BYTES = 8 * 1024 * 1024; // 8 Mo
const MAX_MEDIA_VIDEO_BYTES = 100 * 1024 * 1024; // 100 Mo
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 Mo

function safeKeySegment(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return `${randomUUID()}.${ext}`;
}

function publicUrlFor(key: string): string {
  if (PUBLIC_BASE_URL) return `${PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  return `https://${PUBLIC_BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

async function createPrivateUploadPost(prefix: string, fileName: string, contentType: string, maxBytes: number) {
  if (!PRIVATE_BUCKET) throw new StorageNotConfiguredError();
  if (!DOCUMENT_TYPES.includes(contentType)) {
    throw new Error("Type de fichier non autorisé (images JPEG/PNG/WEBP ou PDF uniquement).");
  }
  const key = `${prefix}/${safeKeySegment(fileName)}`;

  const client = getClient();
  const { url, fields } = await createPresignedPost(client, {
    Bucket: PRIVATE_BUCKET,
    Key: key,
    Conditions: [["content-length-range", 0, maxBytes], ["eq", "$Content-Type", contentType]],
    Fields: { "Content-Type": contentType },
    Expires: 300,
  });

  return { url, fields, key };
}

/**
 * Génère un formulaire d'upload présigné pour une pièce d'identité, stockée dans le
 * bucket PRIVÉ. Jamais d'URL publique renvoyée — seule la clé S3 est stockée en base
 * (voir IdentityDocument.fileUrl) et une URL de consultation est régénérée à la demande,
 * de courte durée, uniquement pour un utilisateur autorisé (section 26 du cahier des charges).
 */
export async function createIdentityDocumentUploadPost(userId: string, fileName: string, contentType: string) {
  return createPrivateUploadPost(`identity/${userId}`, fileName, contentType, MAX_DOCUMENT_BYTES);
}

/**
 * Preuve de paiement (capture d'écran, reçu...) jointe à une déclaration de paiement.
 * Même logique que les documents d'identité : bucket privé, clé stockée sur
 * PaymentSubmission.proofUrl, consultation via URL signée réservée au staff autorisé.
 */
export async function createPaymentProofUploadPost(userId: string, fileName: string, contentType: string) {
  return createPrivateUploadPost(`payment-proofs/${userId}`, fileName, contentType, MAX_DOCUMENT_BYTES);
}

/**
 * Pièce jointe dans la messagerie interne. Bucket privé également : une conversation client
 * ↔ staff peut contenir des informations personnelles (référence de paiement, capture d'un
 * document...), elle ne doit jamais être accessible publiquement.
 */
export async function createMessageAttachmentUploadPost(userId: string, fileName: string, contentType: string) {
  return createPrivateUploadPost(`messages/${userId}`, fileName, contentType, MAX_DOCUMENT_BYTES);
}

/**
 * Génère un formulaire d'upload présigné (POST) pour un média de produit (image ou vidéo),
 * stocké dans le bucket PUBLIC + servi via CDN. Utilisé par /admin/products (ProductForm).
 */
export async function createProductMediaUploadPost(fileName: string, contentType: string) {
  if (!PUBLIC_BUCKET) throw new StorageNotConfiguredError();
  const isImage = IMAGE_TYPES.includes(contentType);
  const isVideo = VIDEO_TYPES.includes(contentType);
  if (!isImage && !isVideo) {
    throw new Error("Type de fichier non autorisé (images JPEG/PNG/WEBP/GIF ou vidéos MP4/WEBM uniquement).");
  }
  const maxBytes = isVideo ? MAX_MEDIA_VIDEO_BYTES : MAX_MEDIA_IMAGE_BYTES;
  const key = `products/${safeKeySegment(fileName)}`;

  const client = getClient();
  const { url, fields } = await createPresignedPost(client, {
    Bucket: PUBLIC_BUCKET,
    Key: key,
    Conditions: [["content-length-range", 0, maxBytes], ["eq", "$Content-Type", contentType]],
    Fields: { "Content-Type": contentType },
    Expires: 300,
  });

  return { url, fields, key, publicUrl: publicUrlFor(key), mediaType: isVideo ? "VIDEO" : "IMAGE" as const };
}

export async function uploadProductMedia(fileName: string, contentType: string, body: Uint8Array) {
  if (!PUBLIC_BUCKET) throw new StorageNotConfiguredError();
  const isImage = IMAGE_TYPES.includes(contentType);
  const isVideo = VIDEO_TYPES.includes(contentType);
  if (!isImage && !isVideo) {
    throw new Error("Type de fichier non autorisé (images JPEG/PNG/WEBP/GIF ou vidéos MP4/WEBM uniquement).");
  }
  const maxBytes = isVideo ? MAX_MEDIA_VIDEO_BYTES : MAX_MEDIA_IMAGE_BYTES;
  if (body.byteLength > maxBytes) {
    throw new Error(`Fichier trop volumineux (maximum ${isVideo ? "100 Mo" : "8 Mo"}).`);
  }
  const key = `products/${safeKeySegment(fileName)}`;
  const client = getClient();
  await client.send(new PutObjectCommand({ Bucket: PUBLIC_BUCKET, Key: key, Body: body, ContentType: contentType }));
  return { key, publicUrl: publicUrlFor(key), mediaType: isVideo ? "VIDEO" : "IMAGE" as const };
}

export async function uploadAvatar(userId: string, fileName: string, contentType: string, body: Uint8Array) {
  if (!PUBLIC_BUCKET) throw new StorageNotConfiguredError();
  if (!IMAGE_TYPES.includes(contentType)) {
    throw new Error("Type de fichier non autorisé (images JPEG/PNG/WEBP/GIF uniquement).");
  }
  const maxBytes = 4 * 1024 * 1024;
  if (body.byteLength > maxBytes) throw new Error("Fichier trop volumineux (maximum 4 Mo).");
  const key = `avatars/${userId}/${safeKeySegment(fileName)}`;
  const client = getClient();
  await client.send(new PutObjectCommand({ Bucket: PUBLIC_BUCKET, Key: key, Body: body, ContentType: contentType }));
  return { key, publicUrl: publicUrlFor(key) };
}

export async function uploadIdentityDocument(userId: string, fileName: string, contentType: string, body: Uint8Array) {
  if (!PRIVATE_BUCKET) throw new StorageNotConfiguredError();
  if (!DOCUMENT_TYPES.includes(contentType)) {
    throw new Error("Type de fichier non autorisé (images JPEG/PNG/WEBP ou PDF uniquement).");
  }
  const maxBytes = 4 * 1024 * 1024;
  if (body.byteLength > maxBytes) throw new Error("Fichier trop volumineux (maximum 4 Mo sur Vercel).");
  const key = `identity/${userId}/${safeKeySegment(fileName)}`;
  const client = getClient();
  await client.send(new PutObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key, Body: body, ContentType: contentType }));
  return { key };
}

/**
 * Régénère une URL de consultation temporaire (5 min par défaut) pour un objet du bucket
 * privé. Chaque appel doit être précédé d'une vérification de permission côté appelant, et
 * idéalement journalisé dans admin_logs (voir /api/admin/documents/[id]).
 */
export async function presignPrivateDownload(key: string, expiresInSeconds = 300): Promise<string> {
  if (!PRIVATE_BUCKET) throw new StorageNotConfiguredError();
  const client = getClient();
  const command = new GetObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Génère un formulaire d'upload présigné pour la photo de profil d'un utilisateur (bucket
 * PUBLIC — c'est une donnée non sensible). Contrairement aux médias produits, aucune
 * permission spéciale n'est requise : chaque utilisateur ne peut modifier que son propre
 * avatar (la clé S3 inclut son userId, et la route API vérifie qu'il modifie bien SON profil).
 */
export async function createAvatarUploadPost(userId: string, fileName: string, contentType: string) {
  if (!PUBLIC_BUCKET) throw new StorageNotConfiguredError();
  if (!IMAGE_TYPES.includes(contentType)) {
    throw new Error("Type de fichier non autorisé (images JPEG/PNG/WEBP/GIF uniquement).");
  }
  const MAX_AVATAR_BYTES = 4 * 1024 * 1024; // 4 Mo
  const key = `avatars/${userId}/${safeKeySegment(fileName)}`;

  const client = getClient();
  const { url, fields } = await createPresignedPost(client, {
    Bucket: PUBLIC_BUCKET,
    Key: key,
    Conditions: [["content-length-range", 0, MAX_AVATAR_BYTES], ["eq", "$Content-Type", contentType]],
    Fields: { "Content-Type": contentType },
    Expires: 300,
  });

  return { url, fields, key, publicUrl: publicUrlFor(key) };
}

export function isStorageConfigured(): boolean {
  return !!(REGION && ACCESS_KEY && SECRET_KEY && PUBLIC_BUCKET && PRIVATE_BUCKET);
}
