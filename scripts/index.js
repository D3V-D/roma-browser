example.ping() // test

//search bar handling
let previous_was_error = false

searchBar.addEventListener("keypress", (e)=> {
    if (e.keyCode == 13) {

        
        let url = document.getElementById("searchBar").value

        if (webpage.validate(url)) {
            if (url.startsWith('https://')){
                webpage.open(url)
            } else if (url.startsWith('http://')) { // un secured links
                url = url.slice(7)
                webpage.open("https://" + url)
            } else {
                webpage.open('https://' + url)
            }
        } else if (url.startsWith('http://localhost') || url.startsWith('https://')) {
            webpage.open(url) //handle cases in which there is a valid http: but it is missed by regex
        } else if (url.startsWith('localhost')) { 
            webpage.open('http://' + url) //handle localhost case
        } else if (url.length > 0) {
            webpage.open('https://duckduckgo.com/' + url) // handle normal non-link searches
        } 


        
    }
})


// handle back, forwards, and refresh
const back = document.getElementById('back')
const forwards = document.getElementById('forwards')
const refresh = document.getElementById('refresh')

back.addEventListener('click', ()=> {
    webpage.goBack()
})

forwards.addEventListener('click', ()=> {
    webpage.goForward()
})

refresh.addEventListener('click', ()=> {
    webpage.refresh()
})

// add new tab
const addTab = document.getElementById('add-tab')

addTab.addEventListener('click', ()=> {
    webpage.addTab()

    let tabs = document.getElementById("tabs")
    let tabBar = document.getElementById("tab-bar")   
    let tabsW =  window.getComputedStyle(tabs).getPropertyValue('width').slice(0, -2)
    let maxW = window.getComputedStyle(tabBar).getPropertyValue('width').slice(0, -2)
    tabsW = parseInt(tabsW)
    maxW = parseInt(maxW) - (window.innerWidth * 0.2) - 5

    // detect when length of tabs is too long and adds scroll buttons
    if (tabsW >= maxW) {
        document.getElementById('scroll-button-left').classList.remove('hide')
        document.getElementById('scroll-button-right').classList.remove('hide')
    }
})


