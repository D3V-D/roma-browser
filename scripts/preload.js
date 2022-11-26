const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('example', {
  something: () => "using example.something() in index.js will return this.",
  else: () => "while using example.else() in index.js will return this string instead",
  ping: () => /** using this will send a message to main, to which main will respond. lets index.js talk to main.js */ ipcRenderer.invoke('ping')
})