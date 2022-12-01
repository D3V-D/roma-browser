const { Menu, app, dialog, ipcMain, BrowserView, BrowserWindow, webContents } = require('electron')
const path = require('path');
let win;
let view;
let currViewIndex;
let numTabs = 0;
const top_bar_height = 100;
let browserViews = [];
let currURL;
let homepageURL = "https://duckduckgo.com/"
const isMac = process.platform === 'darwin'

// function to create new tabs
function addAndSwitchToTab() {
  currViewIndex = browserViews.length
  win.webContents.send("new-tab", currViewIndex)
  browserViews[currViewIndex] = new BrowserView()
  view = browserViews[currViewIndex]
  view.webContents.loadURL(homepageURL)
  win.webContents.send('urlUpdated', '')
  win.setBrowserView(view)
  numTabs ++;
  handleWindowResize()

      // update url on navigation
      view.webContents.on('did-navigate', (event, url)=> {
        if(!url.startsWith("file:") && !(url == homepageURL)) {
          currURL = url
          win.webContents.send('urlUpdated', currURL)
        }

        if (url == homepageURL) {
          currURL = homepageURL
          win.webContents.send('urlUpdated', '')
        }
  
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
  
        //animate loading button when loading
        if(view.webContents.isLoading()) {
          win.webContents.send('loading...')
        }
        
      })
      
      view.webContents.on('did-finish-load', (e) => {
        win.webContents.send('done-loading')
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
  
      //handle certificate error
      view.webContents.on('certificate-error', (e, url, err, cert) => {
        currURL = url
        view.webContents.loadFile('html/insecure.html')
      })
  
      //handle failed url
      view.webContents.on('did-fail-load', (e, eCode, eDesc, validatedURL) =>{
        if (eCode != -3) {// -3 means user action
          currURL = validatedURL
          view.webContents.loadFile('html/error.html')
        }
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
            { role: 'close' }
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

    // handle shortcuts
    win.webContents.on('before-input-event', (event, input) => {
    
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
    })
}

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

ipcMain.handle('removeTab', (e, id)=> {
  // id == index to delete
  if (id == currViewIndex && numTabs > 1) {
    //if deleting current tab and it's not the only tab
    
    //check if current tab is first tab. if so, switch to second tab. if not, switch to tab before this one.
    if (currViewIndex == 0) {
      view = browserViews[1]
      currViewIndex += 1
    } else {
      view = browserViews[currViewIndex-1]      
      currViewIndex -= 1
    }

    win.setBrowserView(view)
    browserViews[id].destroy
    win.webContents.send('tab-destroyed', id)
    win.webContents.send('urlUpdated', view.webContents.getURL())
    browserViews.splice(id, 1)
    numTabs -= 1;
    handleWindowResize()
  } else if (numTabs == 1) {
    // if deleting last tab
    win.close()
  } else if (id < currViewIndex) {
    // if deleting tab before the one we are on
    browserViews[id].destroy
    win.webContents.send('tab-destroyed', id)
    browserViews.splice(id, 1)
    currViewIndex -= 1;
    numTabs -= 1;
  } else if (id > currViewIndex) {
    // if deleting a tab after the current tab
    browserViews[id].destroy
    win.webContents.send('tab-destroyed', id)
    browserViews.splice(id, 1)
    numTabs -= 1;
  }
})

ipcMain.handle('switchTab', (e, id) => {
  currViewIndex = id
  view = browserViews[id]
  win.setBrowserView(view)
  currURL = browserViews[id].webContents.getURL()
  if (currURL != homepageURL) {
    win.webContents.send("urlUpdated", currURL)
  } else {
    win.webContents.send("urlUpdated", '')
  }

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

