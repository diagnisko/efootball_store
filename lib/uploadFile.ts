export interface PresignedUploadResult {
  url: string;
  fields: Record<string, string>;
  key: string;
  publicUrl?: string;
  mediaType?: "IMAGE" | "VIDEO";
}

/**
 * 1. Demande une URL présignée à notre backend (qui vérifie les permissions).
 * 2. Upload le fichier DIRECTEMENT vers S3 (le fichier ne transite jamais par notre serveur).
 * Lève une erreur explicite et lisible en cas d'échec à n'importe quelle étape.
 */
export async function uploadFileViaPresignedPost(
  presignEndpoint: string,
  file: File
): Promise<PresignedUploadResult> {
  const presignRes = await fetch(presignEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType: file.type }),
  });

  const presignData = await presignRes.json().catch(() => ({}));
  if (!presignRes.ok) {
    throw new Error(presignData.error || "Impossible de préparer l'upload.");
  }

  const { url, fields } = presignData as PresignedUploadResult;
  const formData = new FormData();
  Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
  formData.append("file", file);

  let uploadRes: Response;
  try {
    uploadRes = await fetch(url, { method: "POST", body: formData });
  } catch {
    // Un fetch() qui rejette (au lieu de renvoyer une réponse HTTP, même en erreur) sur
    // l'upload direct vers S3 signifie presque toujours que le navigateur n'a même pas pu
    // atteindre le bucket : configuration CORS manquante sur le bucket S3 (cause la plus
    // fréquente), ou bucket/URL invalide. Voir CHANGELOG-refonte-backoffice.md pour la
    // configuration CORS attendue. Sans ce catch, l'erreur brute du navigateur
    // ("Failed to fetch") remontait telle quelle, illisible pour l'utilisateur.
    throw new Error(
      "Impossible de contacter le stockage cloud (S3) depuis le navigateur. C'est presque " +
        "toujours un problème de configuration CORS sur le bucket S3, pas un bug de l'application " +
        "— voir la section \"Upload de fichiers\" du README pour la configuration CORS attendue."
    );
  }
  if (!uploadRes.ok) {
    const body = await uploadRes.text().catch(() => "");
    throw new Error(
      `Le stockage cloud a refusé le fichier (HTTP ${uploadRes.status}).` +
        (body ? ` Détail : ${body.slice(0, 200)}` : "")
    );
  }

  return presignData as PresignedUploadResult;
}
