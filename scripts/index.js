example.ping() // test

searchBar.addEventListener("keypress", (e)=> {
    if (e.keyCode == 13) {
        let url = document.getElementById("searchBar").value
        
        if (url.startsWith('https://')){
            webpage.open(url)
        } else if (url.length > 0) {
            webpage.open('https://duckduckgo.com/' + url)
        } 
    }
})