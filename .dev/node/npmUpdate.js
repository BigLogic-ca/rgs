const execSync = require("node:child_process").execSync

execSync("cd ../.. && npx npm-check-updates -u && npm i --force", { stdio: [0, 1, 2] })
execSync("cd ../../tests && npx npm-check-updates -u && npm i --force", { stdio: [0, 1, 2] })

execSync("node changeVersion.js", { stdio: [0, 1, 2] })
