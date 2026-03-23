export const include = [
  { from: '.github/COPYRIGHT.md', to: 'COPYRIGHT.md' },
  { from: '.github/LICENSE.md', to: 'LICENSE.md' },
  { from: '.github/SECURITY.md', to: 'SECURITY.md' },
  { from: '.github/FUNDING.yml', to: 'FUNDING.yml' },
  // { from: 'docs/README.md', to: 'README.md' },
  // { from: 'docs/SKILL.md', to: 'SKILL.md' },
  { from: 'package.json', to: 'package.json' },
  { from: 'types/', to: 'types/' },
  { from: 'docs/', to: '.' }
]

export const plug = {
  copyStatic: true,
  injectCss: false,
  types: false
}
