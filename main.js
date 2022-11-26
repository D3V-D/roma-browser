const { app, ipcMain, BrowserView, BrowserWindow } = require('electron')
const path = require('path');
let win;
let view;
const top_bar_height = 75;

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
      minWidth: 100,
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
    win.setBrowserView(view)
    view.setBounds({ x: 0, y: top_bar_height, width: 800, height: 525 })
    view.setAutoResize({ width: false, height: true, vetrical: true, horizontal: true})
    view.webContents.loadURL('https://duckduckgo.com')
    win.maximize()

    win.on("resize", handleWindowResize);
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

ipcMain.handle("openPage", async (event, url) => {
  try { 
    await view.webContents.loadURL(url) 
    return true
  } 
  catch(err) { return false }
})

ipcMain.handle('loadingError', ()=> {
  let errorView = new BrowserView
  win.setBrowserView(errorView)
  errorView.setBounds({ x: 0, y: top_bar_height, width: 800, height: 525 })
  errorView.setAutoResize({ width: false, height: true, vetrical: true, horizontal: true})
  errorView.webContents.loadFile('html/error.html')

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

  win.on("resize", handleWindowResizeErr);
}) 

ipcMain.handle('undoLoadingError', ()=> {
  win.setBrowserView(view)
  handleWindowResize()
})
