/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const React = require('react')
const ImmutableComponent = require('./immutableComponent')
const Dialog = require('./dialog')
const Button = require('./button')
const SwitchControl = require('./switchControl')
const windowActions = require('../actions/windowActions')
const appActions = require('../actions/appActions')

class ImportBrowserDataPanel extends ImmutableComponent {
  constructor () {
    super()
    this.onToggleHistory = this.onToggleSetting.bind(this, 'history')
    this.onToggleFavorites = this.onToggleSetting.bind(this, 'favorites')
    this.onToggleCookies = this.onToggleSetting.bind(this, 'cookies')
    this.onImport = this.onImport.bind(this)
    this.onChange = this.onChange.bind(this)
  }
  onToggleSetting (setting, e) {
    windowActions.setImportBrowserDataSelected(this.props.importBrowserDataSelected.set(setting, e.target.value))
  }
  get browserData () {
    let index = this.props.importBrowserDataSelected.get('index')
    if (index === undefined) {
      index = '0'
    }
    return this.props.importBrowserDataDetail.get(index)
  }
  get supportHistory () {
    let browserData = this.browserData
    if (browserData === undefined) {
      return false
    }
    return browserData.get('history')
  }
  get supportFavorites () {
    let browserData = this.browserData
    if (browserData === undefined) {
      return false
    }
    return browserData.get('favorites')
  }
  get supportCookies () {
    let browserData = this.browserData
    if (browserData === undefined) {
      return false
    }
    return browserData.get('cookies')
  }
  onImport () {
    let index = this.props.importBrowserDataSelected.get('index')
    if (index === undefined) {
      this.props.importBrowserDataSelected = this.props.importBrowserDataSelected.set('index', '0')
    }
    let browserData = this.browserData
    if (browserData !== undefined) {
      let type = browserData.get('type')
      this.props.importBrowserDataSelected = this.props.importBrowserDataSelected.set('type', type)
    }
    appActions.importBrowserData(this.props.importBrowserDataSelected)
    this.props.onHide()
  }
  onChange (e) {
    windowActions.setImportBrowserDataSelected(
      this.props.importBrowserDataSelected.set('index', e.target.value))
  }
  get selectedBrowser () {
    let index = this.props.importBrowserDataSelected.get('index')
    return index !== undefined ? index : '0'
  }
  render () {
    var browsers = []
    if (this.props.importBrowserDataDetail !== undefined) {
      this.props.importBrowserDataDetail.toJS().forEach((browser) => {
        browsers.push(<option value={browser.index}>{browser.name}</option>)
      })
    }
    return <Dialog onHide={this.props.onHide} className='importBrowserDataPanel' isClickDismiss>
      <div className='importBrowserData' onClick={(e) => e.stopPropagation()}>
        <div className='formSection importBrowserDataTitle' data-l10n-id='importBrowserData' />
        <div className='formSection importBrowserDataOptions'>
          <select value={this.selectedBrowser}
            onChange={this.onChange} >
            {browsers}
          </select>
          <SwitchControl rightl10nId='browserHistory' checkedOn={this.props.importBrowserDataSelected.get('history')}
            onClick={this.onToggleHistory} disabled={!this.supportHistory} />
          <SwitchControl rightl10nId='favoritesOrBookmarks' checkedOn={this.props.importBrowserDataSelected.get('favorites')}
            onClick={this.onToggleFavorites} disabled={!this.supportFavorites} />
          <SwitchControl rightl10nId='cookies' checkedOn={this.props.importBrowserDataSelected.get('cookies')}
            onClick={this.onToggleCookies} disabled={!this.supportCookies} />
        </div>
        <div className='formSection importBrowserDataButtons'>
          <Button l10nId='cancel' className='secondaryAltButton' onClick={this.props.onHide} />
          <Button l10nId='import' className='primaryButton' onClick={this.onImport} />
        </div>
        <div className='formSection importBrowserDataWarning'>
          <div data-l10n-id='importDataWarning' />
        </div>
      </div>
    </Dialog>
  }
}

module.exports = ImportBrowserDataPanel
