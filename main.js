const { app, ipcMain, BrowserView, BrowserWindow, webContents } = require('electron')
const path = require('path');
let win;
let view;
const top_bar_height = 100;
let currView;
let errorView;
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
    currURL = 'https://duckduckgo.com'
    win.setBrowserView(view)
    currView = view;
    win.maximize()
    

    win.on("resize", handleWindowResize);

    // update url on navigation
    view.webContents.on('did-navigate', (event, url)=> {
      currURL = url
      win.webContents.send('urlUpdated', currURL)
    })
        
    //handle failed url
    view.webContents.on('did-fail-load', (e, eCode, eDesc, validatedURL) =>{
      currURL = validatedURL
      errorView = new BrowserView
      errorView.setBounds({ x: 0, y: top_bar_height, width: 800, height: 500 })
      errorView.setAutoResize({ width: false, height: true, vetrical: true, horizontal: true})
      errorView.webContents.loadFile('html/error.html')
      win.setBrowserView(errorView)
      currView = errorView;
      

      //handle window resizing (copied from main view)
      let lastHandle;
      function handleWindowResizeErr() {
        // the setTimeout is necessary because it runs after the event listener is handled
        lastHandle = setTimeout(() => {
          if (lastHandle != null) clearTimeout(lastHandle);
            if (errorView) 
              errorView.setBounds({
                x: 0,
                y: top_bar_height,
                width: win.getBounds().width,
                height: win.getBounds().height - top_bar_height,
              });
          }, 0);
      }
          
          // handle once since it's not resized instantly
          handleWindowResizeErr()
          
          win.on("resize", handleWindowResizeErr)
    })

    //remove error when started to load new page
    view.webContents.on('did-start-loading', (e) => {
      if (currView == errorView) { 
        win.setBrowserView(view)
        currURL = view.webContents.getURL()
        currView = view;
        handleWindowResize()
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
    if (currView == errorView) { // if error page, then go back to normal view
      view.webContents.goBack()
      win.setBrowserView(view)
      currView = view;
      handleWindowResize()
    } else { //normal view
      view.webContents.goBack()
    }
  }
})

ipcMain.handle('goForward', ()=> {
  if (view.webContents.canGoForward()) {
    if (currView == errorView) { // if error page, then go back to normal view
      view.webContents.goForward()
      win.setBrowserView(view)
      currView = view;
      handleWindowResize()
    } else { //normal view
      view.webContents.goForward()
    }
  }
})

ipcMain.handle('refresh', ()=> {
  if (currView == view) {
    view.webContents.reload()
    console.log('reloaded')
  } else if (currView == errorView) {
    errorView.webContents.reload()
    console.log('reloaded')
  }
})