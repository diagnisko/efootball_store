import { POST as forgotPassword } from "../app/api/auth/forgot-password/route";
import { verificationCodeProvidedEmail } from "../lib/email-templates";

async function main() {
  const forgotRes = await forgotPassword(
    new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "Misterdou.com@gmail.com" }),
    })
  );

  const forgotBody = await forgotRes.text();
  console.log("FORGOT_STATUS", forgotRes.status);
  console.log("FORGOT_BODY", forgotBody);

  const emailTemplate = verificationCodeProvidedEmail("Client", "Compte premium", "A1B2C3");
  console.log("CODE_TEMPLATE_HAS_CODE", emailTemplate.html.includes("A1B2C3"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
