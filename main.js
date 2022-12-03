const { Menu, app, dialog, ipcMain, BrowserView, BrowserWindow, webContents } = require('electron')
const contextMenu = require('electron-context-menu')
const path = require('path');
const fs = require('fs');
let win;
let view;
let currViewIndex;
let currFavURL;
let goAheadInsecure = false;
let numTabs = 0;
const top_bar_height = 100;
let browserViews = [];
let currURL;
let homepageURL = "https://duckduckgo.com/"
const isMac = process.platform === 'darwin'

// function to create new tabs
function addAndSwitchToTab(urlToOpen) {
  if (!urlToOpen) {
    urlToOpen = homepageURL
  }

  currViewIndex = browserViews.length

  if (view) {
    win.webContents.send("new-tab", currViewIndex, browserViews.indexOf(view))
  } else {
    win.webContents.send("new-tab", currViewIndex)
  }

  browserViews[currViewIndex] = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'scripts/preload.js')
    }
  })

  view = browserViews[currViewIndex]
  view.webContents.loadURL(urlToOpen)
  
  if (urlToOpen == homepageURL) {
    win.webContents.send('urlUpdated', '')
  }

  win.webContents.send('fullscreen-off')
  win.setBrowserView(view)
  view.webContents.focus()
  numTabs ++;
  handleWindowResize()

  // setup contextMenu in page
  contextMenu({
    window: view,
    showCopyImageAddress: true,
    showCopyImage: true,
    showSaveImageAs: true,
    showSaveLinkAs: true,
    showCopyLink: true,
    showSearchWithGoogle: false,
    showInspectElement: false,
    showLearnSpelling: false,
    prepend: (defaultActions, parameters, view) => [
      {
        label: 'Search for “{selection}”',
        // Only show it when right-clicking text
        visible: parameters.selectionText.trim().length > 0,
        click: () => {
          addAndSwitchToTab(`https://duckduckgo.com/search?q=${encodeURIComponent(parameters.selectionText)}`);
        }
      },
      {
        label: 'Save Page As',
        // only when right clicking on a blank area
        visible: parameters.mediaType == "none" && parameters.selectionText.trim().length == 0,
        click: () => {
          view.webContents.downloadURL(currURL)
        }
      },
      {
        label: 'Open Link in New Tab',
        visible: parameters.linkURL,
        click: () => {
          addAndSwitchToTab(parameters.linkURL)
        }
      }
    ],
    append: (defaultActions, parameters, view) => [
      {
        label: "Inspect Element",
        visible: parameters.frame,
        click: () => {
          view.webContents.openDevTools("right")
        }
      }
    ]
  });

      // handle shortcuts (in view)
    view.webContents.on('before-input-event', (event, input) => {
      if (input.type == 'keyDown') {
        // open tab Ctrl + T
        if (input.control && input.key.toLowerCase() === 't') {
          addAndSwitchToTab()
          event.preventDefault()
        }

        // close tab Ctrl + W
        if (input.control && input.key.toLowerCase() === 'w') {
          win.webContents.send('close-tab', currViewIndex)
          event.preventDefault()
        }

        // open devTools Ctrl + Shift + I
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
          view.webContents.openDevTools("right")
          event.preventDefault()
        }
      
        // reload on Ctrl + R
        if (input.control && input.key.toLowerCase() === 'r') {
          view.webContents.reload()
          event.preventDefault()
        }
      }
    })

    // handle fullscreen
    view.webContents.on('enter-html-full-screen', (e) => {
      setTimeout(() => {
        if (win)
        view.setBounds({
          x: 0,
          y: 0,
          width: win.getBounds().width,
          height: win.getBounds().height,
        });
        }, 0);
      win.webContents.send('fullscreen-on')
    })

    

    // handle leaving fullscreen
    view.webContents.on('leave-html-full-screen', (e) => {
      setTimeout(() => {
        if (win)
        view.setBounds({
          x: 0,
          y: top_bar_height,
          width: win.getBounds().width,
          height: win.getBounds().height - top_bar_height,
        });
        }, 0);
      win.webContents.send('fullscreen-off')
    })

    
      // update url on navigation
      view.webContents.on('did-navigate', (event, url)=> {
        
        if (!url.startsWith('file://')) {
          currURL = url
        }
        
        win.webContents.send('urlUpdated', currURL)
  
         // grey out button if not able to go back/forward
        if (!view.webContents.canGoBack()) {
          win.webContents.send('cannotGoBack')
        } else {
          win.webContents.send('canGoBack')
        }
  
        if (!view.webContents.canGoForward()) {
          win.webContents.send('cannotGoForward')
        } else {
          win.webContents.send('canGoForward')
        }        
      })
    
      //animate loading button on load
      view.webContents.on('did-start-loading', (e) => {
        win.webContents.send('loading...', currViewIndex)
      })
      
      view.webContents.on('did-stop-loading', (e) => {
        win.webContents.send('done-loading', currViewIndex, currFavURL)
      })

      view.webContents.on('did-finish-load', (e) => {
        win.webContents.send('done-loading', currViewIndex, currFavURL)
      })

      //whenever title of page is updated, change tab title
      view.webContents.on('page-title-updated', (e)=> {
        if (currURL != homepageURL) {
          let title = view.webContents.getTitle()
          win.webContents.send("title-updated", title, currViewIndex)
        } else {
          win.webContents.send('title-updated', "New Tab", currViewIndex)
        }
      })

      //similarly, update favicon
      view.webContents.on('page-favicon-updated', (e, favicons)=> {
        if (currURL != homepageURL) {
          win.webContents.send('favicon-updated', favicons[0], currViewIndex)
          currFavURL = favicons[0]
        } else {
          win.webContents.send('favicon-updated', "img/favicon.ico", currViewIndex)
          currFavURL = "img/favicon.ico"
        }
      })
  
      //handle certificate error
      view.webContents.on('certificate-error', (e, url, err, cert, callback) => {
        if (goAheadInsecure) {
          currURL = url
          e.preventDefault()
          callback(true)
          goAheadInsecure = false
        } else {
          callback(false)
          currURL = url
          currFavURL = "img/error.ico"
          console.log(err)
          view.webContents.loadFile('error/insecure.html')
          win.webContents.send('favicon-updated', "img/error.ico", currViewIndex)
          
          let storeErr = {
            lastErr: err,
            cert: cert
          }

          fs.writeFile('jsons/error.json', JSON.stringify(storeErr), (error) => {
            if (error) throw error
          })
        }
      })
  
      //handle failed url
      view.webContents.on('did-fail-load', (e, eCode, eDesc, validatedURL) =>{
        if (eCode != -3) {// -3 means user action
          currURL = validatedURL
          currFavURL = "img/error.ico"
          view.webContents.loadFile('error/error.html')
        }
        win.webContents.send('done-loading')
      })
  
      //handle unresponsiveness
      view.webContents.on('unresponsive', async () => {
        const { response } = await dialog.showMessageBox({
          message: 'This site has become unresponsive',
          title: 'Do you want to try forcefully reloading?',
          buttons: ['OK', 'Wait'],
          cancelId: 1
        })
        if (response === 0) {
          contents.forcefullyCrashRenderer()
          contents.reload()
        }
      })
      
  
      //handle potentially unsaved work
      view.webContents.on('will-prevent-unload', (event) => {
        const choice = dialog.showMessageBoxSync(win, {
          type: 'question',
          buttons: ['Leave', 'Stay'],
          title: 'Do you want to leave this site?',
          message: 'Changes you made may not be saved.',
          defaultId: 0,
          cancelId: 1
        })
        const leave = (choice === 0)
        if (leave) {
          event.preventDefault()
        }
      })

}

//handle window resizing
let lastHandle;
function handleWindowResize() {
  // the setTimeout is necessary because it runs after the event listener is handled
  lastHandle = setTimeout(() => {
    if (lastHandle != null) clearTimeout(lastHandle);
    if (win)
      view.setBounds({
        x: 0,
        y: top_bar_height,
        width: win.getBounds().width,
        height: win.getBounds().height - top_bar_height,
      });
  }, 0);
}

// function called upon creating main window
const createWindow = () => {
    win = new BrowserWindow({
      width: 800,
      height: 600,
      minWidth: 400,
      minHeight: top_bar_height,
      webPreferences: {
        preload: path.join(__dirname, 'scripts/preload.js')
      },
      autoHideMenuBar: true
    })
    // create menu
    const template = [
      // { role: 'appMenu' }
      ...(isMac ? [{
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      }] : []),
      // { role: 'fileMenu' }
      {
        label: 'File',
        submenu: [
          isMac ? { role: 'close' } : { role: 'quit' }
        ]
      },
      // { role: 'editMenu' }
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          ...(isMac ? [
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' },
            { type: 'separator' },
            {
              label: 'Speech',
              submenu: [
                { role: 'startSpeaking' },
                { role: 'stopSpeaking' }
              ]
            }
          ] : [
            { role: 'delete' },
            { type: 'separator' },
            { role: 'selectAll' }
          ])
        ]
      },
      // { role: 'viewMenu' }
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools'}, // comment out in production
          { type: 'separator' },
          { role: 'resetZoom' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      // { role: 'windowMenu' }
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          ...(isMac ? [
            { type: 'separator' },
            { role: 'front' },
            { type: 'separator' },
            { role: 'window' }
          ] : [
            { role: 'minimize' }
          ])
        ]
      },
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  
    win.loadFile('index.html')
    view = new BrowserView({
      webPreferences: {
        devTools: true,
        contextIsolation: true
      }
    });
    
    addAndSwitchToTab()
    win.maximize()
    

    win.on("resize", handleWindowResize);
    win.on("resize", ()=> {
      setTimeout(()=>{
        win.webContents.send("check-scroll-arrows")
      }, 100)
    })

    // handle window fullscreen (diff from maximize)
    win.on('enter-full-screen', (e) => {
      setTimeout(() => {
        if (win)
        view.setBounds({
          x: 0,
          y: 0,
          width: win.getBounds().width,
          height: win.getBounds().height,
        });
        }, 0);
      win.webContents.send('fullscreen-on')
    })

    win.on('leave-full-screen', (e) => {
      setTimeout(() => {
        if (win)
        view.setBounds({
          x: 0,
          y: top_bar_height,
          width: win.getBounds().width,
          height: win.getBounds().height - top_bar_height,
        });
        }, 0);
      win.webContents.send('fullscreen-off')
    })

    // handle shortcuts
    win.webContents.on('before-input-event', (event, input) => {
    
      if (input.type == 'keyDown') {
        // open tab Ctrl + T
        if (input.control && input.key.toLowerCase() === 't') {
          addAndSwitchToTab()
          event.preventDefault()
        }

        // close tab Ctrl + W
        if (input.control && input.key.toLowerCase() === 'w') {
          win.webContents.send('close-tab', currViewIndex)
          event.preventDefault()
        }

        // open devTools Ctrl + Shift + I
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
          view.webContents.openDevTools("right")
          event.preventDefault()
        }
      
        // reload on Ctrl + R
        if (input.control && input.key.toLowerCase() === 'r') {
          view.webContents.reload()
          event.preventDefault()
        }
      }
    })

    
}

// setup contextMenu in topbar
contextMenu({
  window: win,
  showCopyImageAddress: true,
  showCopyImage: true,
  showSaveImageAs: true,
  showSaveLinkAs: true,
  showCopyLink: true,
  showSearchWithGoogle: false,
  showInspectElement: false,
  showLearnSpelling: false,
	prepend: (defaultActions, parameters, win) => [
		{
			label: 'Search for “{selection}”',
			// Only show it when right-clicking text
			visible: parameters.selectionText.trim().length > 0,
			click: () => {
				addAndSwitchToTab(`https://duckduckgo.com/${encodeURIComponent(parameters.selectionText)}`);
			}
		}
	]
});

app.whenReady().then(() => {
    createWindow()

    // MacOS open window if none are open.
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// quit when all windows are closed on Windows/Linux
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

//when it attempts to create new window
app.on('web-contents-created', (createEvent, contents) => {
  
  contents.on('new-window', newEvent => {
    console.log("Blocked by 'new-window'")
    newEvent.preventDefault();
  });
  
  contents.setWindowOpenHandler(({ url }) => {
    addAndSwitchToTab(url)
    currURL = url
    return { action: 'deny' }
  })
  
});

// handle a ping message from preload
ipcMain.handle('ping', () => {
  // do something (in this case prints pong to the terminal)
  console.log('pong')
})

ipcMain.handle("openPage", (event, url) => {
  view.webContents.loadURL(url)
  currURL = view.webContents.getURL()
})


//handle backwards, forwards, and refresh
ipcMain.handle('goBack', ()=> {
  if (view.webContents.canGoBack()) {
    view.webContents.goBack()
  }
})

ipcMain.handle('goForward', ()=> {
  if (view.webContents.canGoForward()) {
    view.webContents.goForward()
  }
})

ipcMain.handle('refresh', ()=> {
  view.webContents.reload()
})

ipcMain.handle('addTab', ()=> {
  addAndSwitchToTab()
})

ipcMain.handle('removeTab', async (e, id)=> {
  // turn off fullscreen in case
  win.webContents.send('fullscreen-off')
  // id == index to delete
  if (id == currViewIndex && numTabs > 1) {
    //if deleting current tab and it's not the only tab
    view.webContents.loadURL(homepageURL)
    win.webContents.send('tab-destroyed', id)
    //check if current tab is first tab. if so, switch to second tab. if not, switch to tab before this one.
    if (currViewIndex == 0) {
      view = browserViews[1]
      win.webContents.send('change-active-tab', "0", "0")
    } else {
      view = browserViews[currViewIndex-1]      
      currViewIndex -= 1
      win.webContents.send('change-active-tab', currViewIndex, id)
    }

    await win.setBrowserView(view)
    win.webContents.send('done-loading')
    browserViews[id].webContents.removeAllListeners()
    browserViews[id] = null
    currURL = view.webContents.getURL()
    win.webContents.send('urlUpdated', view.webContents.getURL())
    browserViews.splice(id, 1)
    numTabs -= 1;
    handleWindowResize()
  } else if (numTabs == 1) {
    // if deleting last tab
    win.close()
  } else if (id < currViewIndex) {
    // if deleting tab before the one we are on
    browserViews[id].webContents.removeAllListeners()
    browserViews[id] = null
    win.webContents.send('tab-destroyed', id)
    browserViews.splice(id, 1)
    currViewIndex -= 1;
    numTabs -= 1;
  } else if (id > currViewIndex) {
    // if deleting a tab after the current tab
    browserViews[id].webContents.removeAllListeners()
    browserViews[id] = null
    win.webContents.send('tab-destroyed', id)
    browserViews.splice(id, 1)
    numTabs -= 1;
  }

  view.webContents.focus()
})

ipcMain.handle('checkCanGoBackOrForward', (e) => {
  // grey out button if not able to go back/forward
  if (!view.webContents.canGoBack()) {
    win.webContents.send('cannotGoBack')
  } else {
    win.webContents.send('canGoBack')
  }

  if (!view.webContents.canGoForward()) {
    win.webContents.send('cannotGoForward')
  } else {
    win.webContents.send('canGoForward')
  }
})

ipcMain.handle('switchTab', (e, id) => {
  win.webContents.send("change-active-tab", id, currViewIndex)
  currViewIndex = id
  view = browserViews[id]
  win.setBrowserView(view)
  currURL = browserViews[id].webContents.getURL()
  win.webContents.send("urlUpdated", currURL)

   // grey out button if not able to go back/forward
   if (!view.webContents.canGoBack()) {
    win.webContents.send('cannotGoBack')
  } else {
    win.webContents.send('canGoBack')
  }

  if (!view.webContents.canGoForward()) {
    win.webContents.send('cannotGoForward')
  } else {
    win.webContents.send('canGoForward')
  }
  handleWindowResize()
})

//handle if they would like to proceed to an insecure site
ipcMain.handle("goAheadInsecure", (e)=>{
  goAheadInsecure = true
  view.webContents.loadURL(currURL)
})
