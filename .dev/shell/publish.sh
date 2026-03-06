
# UPDATE USE OFFICIAL NPM

cd ../..
npm run build

cd ../../vscode-extension
npm run build-dist

npm publish ./dist --access public
