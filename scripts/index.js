example.ping() // test

//search bar handling
let previous_was_error = false

searchBar.addEventListener("keypress", (e)=> {
    if (e.keyCode == 13) {

        
        let url = document.getElementById("searchBar").value

        if (webpage.validate(url)) {
            if (url.startsWith('https://') || url.startsWith('http://')){
                webpage.open(url)
            } else {
                webpage.open('https://' + url)
            }
        } else if (url.startsWith('http://') || url.startsWith('https://')) {
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



    
