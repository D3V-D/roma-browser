example.ping() // test

let previous_was_error = false

searchBar.addEventListener("keypress", (e)=> {
    if (e.keyCode == 13) {
        
        if (previous_was_error) {
            webpage.undoLoadingError()
        }
        
        let url = document.getElementById("searchBar").value
        // check if page was able to load by getting the promise value
        let page_loaded_properly = true;

        if (webpage.validate(url)) {
            if (url.startsWith('https://') || url.startsWith('http://')){
                page_loaded_properly = webpage.open(url)
            } else {
                page_loaded_properly = webpage.open('https://' + url)
            }
        } else if (url.startsWith('http://') || url.startsWith('https://')) {
            page_loaded_properly = webpage.open(url) //handle cases in which there is a valid http: but it is missed by regex
        } else if (url.startsWith('localhost')) { 
            page_loaded_properly = webpage.open('http://' + url) //handle localhost case
        } else if (url.length > 0) {
            webpage.open('https://duckduckgo.com/' + url) // handle normal non-link searches
        } 


        // get the result of the promise (either true or false)
        page_loaded_properly.then((result) => {
            if (result == false) {
                webpage.loadingError()
                previous_was_error = true
            }
        }).catch(err=> console.log(err))
    

    }
})