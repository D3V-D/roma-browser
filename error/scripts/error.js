// handle certificate error functions
const errorGoBack = document.getElementById('go-back')

if (errorGoBack) {
    errorGoBack.addEventListener("click", (e)=>{
        webpage.goBack()
    })
}

const advancedText = document.getElementById('advanced-details')

function secsToDateTime(secs) {
    let t = new Date(Date.UTC(1970, 0, 1)); // Epoch
    t.setUTCSeconds(secs);
    return t;
}

if (advancedText) {
    fetch('../jsons/error.json')
        .then(response => response.json())
        .then(data => advancedText.innerHTML = "Error: " + data.lastErr + "<br>Issuer name: " + data.cert.issuerName + "<br>Expiry date: " + secsToDateTime(data.cert.validExpiry))
        .catch(error => console.log(error))
}

const goAhead = document.getElementById('go-ahead')

goAhead.addEventListener("click", (e) => {
    webpage.goAheadInsecure()
})