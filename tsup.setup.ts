export const include = [
  { from: '.github/COPYRIGHT.md', to: 'COPYRIGHT.md' },
  { from: '.github/LICENSE.md', to: 'LICENSE.md' },
  { from: '.github/SECURITY.md', to: 'SECURITY.md' },
  { from: '.github/FUNDING.yml', to: 'FUNDING.yml' },
  { from: 'package.json', to: 'package.json' },
  { from: 'types/', to: 'types/' },
  { from: 'docs/', to: '.' }
]

export const plug = {
  copyStatic: true,
  injectCss: false,
  types: false
}
