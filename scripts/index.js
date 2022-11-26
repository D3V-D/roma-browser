example.ping() // test

searchBar.addEventListener("keypress", (e)=> {
    if (e.keyCode == 13) {
        let url = document.getElementById("searchBar").value
        webpage.open(url)
    }
})