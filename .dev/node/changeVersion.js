const fs = require('node:fs')
const path = require('node:path')

// Function to update the version in package.json
const updatePackageVersion = (newVersion) => {
  const packagePath = path.join(process.cwd(), '../../package.json')

  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    packageData.version = newVersion.trim()

    fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2))
    console.log(`Version updated to ${newVersion} in package.json`)

  } catch (error) {
    console.error('Error updating package.json:', error)
    process.exit(1)
  }
}

const
  execSync = require("node:child_process").execSync,
  versionArg = execSync("git rev-parse --abbrev-ref HEAD").toString()
if (versionArg) {
  updatePackageVersion(versionArg)
} else {
  console.log('Please provide a new version number as an argument (e.g., 1.2.3)')
  process.exit(1)
}
