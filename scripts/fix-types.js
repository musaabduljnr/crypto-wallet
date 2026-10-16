const fs = require("fs");
const path = require("path");

const perfPath = path.join(__dirname, "..", "node_modules", "@types", "node", "perf_hooks.d.ts");
if (fs.existsSync(perfPath)) {
  let content = fs.readFileSync(perfPath, "utf8");
  if (!content.includes("*/")) {
    content += " detail with measure.\n */\n detail?: unknown;\n }\n}\n";
    fs.writeFileSync(perfPath, content);
    console.log("Fixed perf_hooks.d.ts");
  } else {
    console.log("perf_hooks.d.ts already has closing comment");
  }
} else {
  console.log("perf_hooks.d.ts not found");
}
