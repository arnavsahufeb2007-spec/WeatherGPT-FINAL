import fs from "node:fs";

const existingFiles = [
  "package.json",
  "server.ts",
  "src/languages.ts",
  "src/components/WeatherChat.tsx",
  "src/components/VoiceLanguageModal.tsx",
  "server/services/geminiService.ts",
];

const rawPatch = fs.readFileSync("/app/applet/weathergpt_tasks1_to_4.patch", "utf8");
let fixedPatch = rawPatch;

for (const file of existingFiles) {
  const targetHeader = `diff --git a/${file} b/${file}\nnew file mode 100644\nindex 0000000..`;
  if (fixedPatch.includes(targetHeader)) {
    const regex = new RegExp(
      `diff --git a/${file.replace(/\//g, "\\/")} b/${file.replace(/\//g, "\\/")}\\nnew file mode 100644\\nindex [0-9a-f]+\\.\\.[0-9a-f]+\\n--- \\/dev\\/null\\n\\+\\+\\+ b\\/${file.replace(/\//g, "\\/")}`,
      "g"
    );
    fixedPatch = fixedPatch.replace(
      regex,
      `diff --git a/${file} b/${file}\nindex 1000000..2000000 100644\n--- a/${file}\n+++ b/${file}`
    );
  }
}

fs.writeFileSync("/app/applet/weathergpt_tasks1_to_4_fixed.patch", fixedPatch, "utf8");
console.log("Fixed patch created successfully!");
