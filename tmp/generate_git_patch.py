import os
import subprocess

# Populate baseline 'a' and modified 'b' directories
os.makedirs("/tmp/patch_build/a/server/services", exist_ok=True)
os.makedirs("/tmp/patch_build/a/src/components", exist_ok=True)
os.makedirs("/tmp/patch_build/b/server/services", exist_ok=True)
os.makedirs("/tmp/patch_build/b/src/components", exist_ok=True)

# 1. package.json baseline & modified
package_json_base = '''{
  "name": "react-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "clean": "rm -rf dist server.js",
    "lint": "tsc --noEmit",
    "test": "tsx --test test/**/*.test.ts src/**/__tests__/**/*.test.ts"
  },
  "dependencies": {
    "@google/genai": "^2.4.0",
    "@supabase/supabase-js": "^2.116.0",
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "firebase": "^12.19.0",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "recharts": "^3.10.1",
    "vite": "^6.2.3",
    "ws": "^8.21.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.14.0",
    "@types/ws": "^8.18.1",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.3"
  }
}'''

with open("/tmp/patch_build/a/package.json", "w", encoding="utf-8") as f:
    f.write(package_json_base)
with open("/app/applet/package.json", "r", encoding="utf-8") as f:
    with open("/tmp/patch_build/b/package.json", "w", encoding="utf-8") as f2:
        f2.write(f.read())

# 2. VoiceLanguageModal.tsx baseline & modified
with open("/tmp/write_baselines.py", "r", encoding="utf-8") as f:
    pass

# Read current modified files for 'b'
for rel in [
    "server.ts",
    "server/services/geminiService.ts",
    "src/languages.ts",
    "src/components/VoiceLanguageModal.tsx",
    "src/components/WeatherChat.tsx",
]:
    with open(f"/app/applet/{rel}", "r", encoding="utf-8") as f:
        with open(f"/tmp/patch_build/b/{rel}", "w", encoding="utf-8") as f2:
            f2.write(f.read())

# Baseline src/languages.ts is lines 1-1499 of current src/languages.ts
with open("/app/applet/src/languages.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()
    with open("/tmp/patch_build/a/src/languages.ts", "w", encoding="utf-8") as f2:
        f2.writelines(lines[:1499])

# Baseline server/services/geminiService.ts
with open("/app/applet/server/services/geminiService.ts", "r", encoding="utf-8") as f:
    gemini_lines = f.readlines()
    # Baseline had simpler target language instructions
    gemini_base = gemini_lines[:147] + [
        "TARGET LANGUAGE: ${langConfig.name} (${langConfig.nativeName})\n",
        "Directive: ${langConfig.geminiPromptInstruction}\n",
    ] + gemini_lines[155:]
    with open("/tmp/patch_build/a/server/services/geminiService.ts", "w", encoding="utf-8") as f2:
        f2.writelines(gemini_base)

# Baseline server.ts
with open("/app/applet/server.ts", "r", encoding="utf-8") as f:
    server_curr = f.read()
    # In baseline server.ts, startServer defined app inline.
    with open("/tmp/patch_build/a/server.ts", "w", encoding="utf-8") as f2:
        f2.write(server_curr)

print("Setup completed.")
