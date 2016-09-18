const browserActions = require('./browser/extensions/browserActions')
const {app} = require('electron')
const extensionActions = require('./common/actions/extensionActions')
const AppStore = require('../js/stores/appStore')
const config = require('../js/constants/config')
const {fileUrl} = require('../js/lib/appUrlUtil')
const {getAppUrl, getExtensionsPath, getIndexHTML} = require('../js/lib/appUrlUtil')
const {getSetting} = require('../js/settings')
const settings = require('../js/constants/settings')
const {passwordManagers, extensionIds} = require('../js/constants/passwordManagers')
const path = require('path')
const appStore = require('../js/stores/appStore')
const extensionState = require('./common/state/extensionState')

let generateBraveManifest = () => {
  let baseManifest = {
    name: 'brave',
    manifest_version: 2,
    version: '1.0',
    background: {
      scripts: [ 'content/scripts/idleHandler.js' ]
    },
    content_scripts: [
      {
        run_at: 'document_start',
        all_frames: true,
        matches: ['<all_urls>'],
        include_globs: [
          'http://*/*', 'https://*/*', 'file://*', 'data:*', 'about:srcdoc'
        ],
        exclude_globs: [
          getIndexHTML()
        ],
        match_about_blank: true,
        js: [
          'content/scripts/util.js',
          'content/scripts/navigator.js',
          'content/scripts/blockFlash.js',
          'content/scripts/blockCanvasFingerprinting.js',
          'content/scripts/block3rdPartyContent.js',
          'content/scripts/inputHandler.js'
        ],
        css: [
          'brave-default.css'
        ]
      },
      {
        run_at: 'document_end',
        all_frames: true,
        matches: ['<all_urls>'],
        include_globs: [
          'http://*/*', 'https://*/*', 'file://*', 'data:*', 'about:srcdoc'
        ],
        exclude_globs: [
          getIndexHTML()
        ],
        js: [
          'content/scripts/adInsertion.js',
          'content/scripts/passwordManager.js',
          'content/scripts/flashListener.js',
          'content/scripts/pageInformation.js'
        ]
      },
      {
        run_at: 'document_end',
        all_frames: false,
        matches: ['<all_urls>'],
        include_globs: [
          'http://*/*', 'https://*/*', 'file://*', 'data:*', 'about:srcdoc',
          getIndexHTML(),
          getAppUrl('about-*.html'),
          getAppUrl('about-*.html') + '#*'
        ],
        exclude_globs: [
          getAppUrl('about-blank.html'),
          getAppUrl('about-blank.html') + '#*'
        ],
        js: [
          'content/scripts/spellCheck.js',
          'content/scripts/themeColor.js'
        ]
      },
      {
        run_at: 'document_start',
        js: [
          'content/scripts/util.js',
          'content/scripts/inputHandler.js'
        ],
        matches: [
          '<all_urls>'
        ],
        include_globs: [
          getIndexHTML(),
          getAppUrl('about-*.html'),
          getAppUrl('about-*.html') + '#*'
        ],
        exclude_globs: [
          getAppUrl('about-blank.html'),
          getAppUrl('about-blank.html') + '#*'
        ]
      }
    ],
    permissions: [
      'externally_connectable.all_urls', 'tabs', '<all_urls>', 'contentSettings', 'idle'
    ],
    externally_connectable: {
      matches: [
        '<all_urls>'
      ]
    },
    web_accessible_resources: [
      'about-*.html',
      'img/favicon.ico'
    ],
    incognito: 'spanning',
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAupOLMy5Fd4dCSOtjcApsAQOnuBdTs+OvBVt/3P93noIrf068x0xXkvxbn+fpigcqfNamiJ5CjGyfx9zAIs7zcHwbxjOw0Uih4SllfgtK+svNTeE0r5atMWE0xR489BvsqNuPSxYJUmW28JqhaSZ4SabYrRx114KcU6ko7hkjyPkjQa3P+chStJjIKYgu5tWBiMJp5QVLelKoM+xkY6S7efvJ8AfajxCViLGyDQPDviGr2D0VvIBob0D1ZmAoTvYOWafcNCaqaejPDybFtuLFX3pZBqfyOCyyzGhucyCmfBXJALKbhjRAqN5glNsUmGhhPK87TuGATQfVuZtenMvXMQIDAQAB'
  }

  let cspDirectives = {
    'default-src': '\'self\'',
    'form-action': '\'none\'',
    'referrer': 'no-referrer',
    'style-src': '\'self\' \'unsafe-inline\'',
    'img-src': '* data:',
    'frame-src': '\'self\' https://buy.coinbase.com'
  }

  if (process.env.NODE_ENV === 'development') {
    // allow access to webpack dev server resources
    let devServer = 'localhost:' + process.env.npm_package_config_port
    cspDirectives['default-src'] = '\'self\' http://' + devServer
    cspDirectives['connect-src'] = '\'self\' http://' + devServer + ' ws://' + devServer
    cspDirectives['style-src'] = '\'self\' \'unsafe-inline\' http://' + devServer
  }

  var csp = ''
  for (var directive in cspDirectives) {
    csp += directive + ' ' + cspDirectives[directive] + '; '
  }
  baseManifest.content_security_policy = csp.trim()

  return baseManifest
}

module.exports.init = () => {
  browserActions.init()

  const defaultSession = require('electron').session.defaultSession
  defaultSession.updateClient.on('component-checking-for-updates', () => {
    // console.log('checking for update')
  })
  defaultSession.updateClient.on('component-wait', () => {
    // console.log('component wait')
  })
  defaultSession.updateClient.on('component-update-found', () => {
    // console.log('update-found')
  })
  defaultSession.updateClient.on('component-update-ready', () => {
    // console.log('update-ready')
  })
  defaultSession.updateClient.on('component-update-updated', (e, extensionId, version) => {
    // console.log('update-updated', extensionId, version)
    // Re-setup the installedExtensions info if it exists
    delete installedExtensions[extensionId]
    const extensionPath = path.join(app.getPath('extensionsDir'), extensionId, version)
    installExtension(extensionId, extensionPath)
    enableExtension(extensionId)
  })
  defaultSession.updateClient.on('component-not-updated', () => {
    // console.log('update-not-updated')
  })
  defaultSession.updateClient.on('component-update-downloading', () => {
    // console.log('update-downloading')
  })

  let installedExtensions = {}
  let registeredExtensions = {}
  let extensionInstalled = (installInfo) => {
    if (installInfo.error) {
      console.error(installInfo.error)
      // TODO(bridiver) extensionActions.extensionInstallFailed
      return
    }
    installedExtensions[installInfo.id] = installInfo
    installInfo.filePath = installInfo.base_path
    installInfo.base_path = fileUrl(installInfo.base_path)

    extensionActions.extensionInstalled(installInfo.id, installInfo)
    // console.log('extensionActions.extensionInstalled: ', installInfo)
    enableExtension(installInfo.id)
  }

  let installExtension = (extensionId, path, options = {}) => {
    if (!installedExtensions[extensionId]) {
      // console.log('load extension: ', path, options)
      process.emit('load-extension', path, options, extensionInstalled)
    }
  }

  let enableExtension = (extensionId) => {
    var installInfo = installedExtensions[extensionId]
    if (installInfo) {
      process.emit('enable-extension', installInfo.id)
      extensionActions.extensionEnabled(installInfo.id)
    }
  }

  let disableExtension = (extensionId) => {
    var installInfo = installedExtensions[extensionId]
    if (installInfo) {
      process.emit('disable-extension', installInfo.id)
      extensionActions.extensionDisabled(installInfo.id)
    }
  }

  let registerExtension = (extensionId) => {
    if (!registeredExtensions[extensionId]) {
      defaultSession.updateClient.registerComponent(extensionId)
      registeredExtensions[extensionId] = true
    }
  }

  let checkForUpdate = (extensionId) => {
    defaultSession.updateClient.checkNow(extensionId)
  }

  let enableExtensions = () => {
    installExtension(config.braveExtensionId, getExtensionsPath('brave'), {manifest_location: 'component', manifest: generateBraveManifest()})

    // Re-install previously known about extensions
    const extensions = extensionState.getExtensions(appStore.getState())
    extensions.keySeq()
      .filter((extensionId) => extensionId !== config.braveExtensionId)
      .forEach((extensionId) =>
          installExtension(extensionId, extensions.getIn([extensionId, 'filePath'])))

    if (getSetting(settings.PDFJS_ENABLED)) {
      registerExtension(config.PDFJSExtensionId, getExtensionsPath('pdfjs'))
      checkForUpdate(config.PDFJSExtensionId)
    } else {
      disableExtension(config.PDFJSExtensionId)
    }

    const activePasswordManager = getSetting(settings.ACTIVE_PASSWORD_MANAGER)
    if (activePasswordManager === passwordManagers.ONE_PASSWORD) {
      registerExtension(extensionIds[passwordManagers.ONE_PASSWORD])
      checkForUpdate(extensionIds[passwordManagers.ONE_PASSWORD])
    } else {
      disableExtension(extensionIds[passwordManagers.ONE_PASSWORD])
    }

    if (activePasswordManager === passwordManagers.DASHLANE) {
      registerExtension(extensionIds[passwordManagers.DASHLANE], getExtensionsPath('dashlane'))
      checkForUpdate(extensionIds[passwordManagers.DASHLANE])
    } else {
      disableExtension(extensionIds[passwordManagers.DASHLANE])
    }

    if (activePasswordManager === passwordManagers.LAST_PASS) {
      registerExtension(extensionIds[passwordManagers.LAST_PASS], getExtensionsPath('lastpass'))
      checkForUpdate(extensionIds[passwordManagers.LAST_PASS])
    } else {
      disableExtension(extensionIds[passwordManagers.LAST_PASS])
    }
  }

  enableExtensions()

  AppStore.addChangeListener(() => {
    enableExtensions()
  })
}
