/*
Created by Dario Passariello
*/

const execSync = require("node:child_process").execSync,
  executeGitCommand = (command) => {
    return execSync(command)
      .toString("utf8")
      .replace(/[\n\r\s]+$/, "")
  },
  BRANCH = executeGitCommand("git rev-parse --abbrev-ref HEAD"),
  MASTER = "main",
  MAKEDIST = false

//https://stackoverflow.com/questions/55021363/how-to-pass-current-datetime-in-npm-script-for-git-commit-message-in-windows-and

try {
  if (MAKEDIST) execSync("npm run make-dist", { stdio: [0, 1, 2] })
  execSync("npm run git", { stdio: [0, 1, 2] })
  execSync(`git checkout ${MASTER}`, { stdio: [0, 1, 2] })
  execSync(`git pull origin ${MASTER}`, { stdio: [0, 1, 2] })
  execSync(`git merge ${BRANCH}`, { stdio: [0, 1, 2] })
  execSync(`git push origin ${MASTER}`, { stdio: [0, 1, 2] })
  execSync(`git checkout ${BRANCH}`, { stdio: [0, 1, 2] })
} catch (e) {
  console.error(e)
}
