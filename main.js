const { app, dialog, ipcMain, BrowserView, BrowserWindow, webContents } = require('electron')
const path = require('path');
let win;
let view;
const top_bar_height = 100;
let currView;
let currURL;

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
      }
    })
  
    win.loadFile('index.html')
    view = new BrowserView({
      webPreferences: {
        devTools: true,
        contextIsolation: true
      }
    });
    
    view.setBounds({ x: 0, y: top_bar_height + 100, width: 800, height: 600 - top_bar_height })
    view.setAutoResize({ width: false, height: true, vertical: false, horizontal: true})
    view.webContents.loadURL('https://duckduckgo.com')
    win.setBrowserView(view)
    currURL = 'https://duckduckgo.com'
    currView = view;
    win.maximize()
    

    win.on("resize", handleWindowResize);

    // update url on navigation
    view.webContents.on('did-navigate', (event, url)=> {
      if(!url.startsWith("file:")) {
        currURL = url
        win.webContents.send('urlUpdated', currURL)
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
  view.webContents.loadURL(currURL)
})