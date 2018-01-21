
var url = 'http://videosmnv.s3.amazonaws.com/CV/minerva/js/parsers/SOLReaderWorker.js';
var response;

var get = new XMLHttpRequest();
get.open("GET", url, true);
get.onreadystatechange = function() {
  if(get.readyState == 4 && get.status == 200) {
    alert('ajax call successful');
    response = get.responseText;
  }
}
get.send();

var blob;
try {
    blob = new Blob([response], {type: 'application/javascript'});
} catch (e) { // Backwards-compatibility
    window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
    blob = new BlobBuilder();
    blob.append(response);
    blob = blob.getBlob();
}
var w_one = new Worker(URL.createObjectURL(blob));
//alert('blob-based worker creation successful');


var worker = new Worker("http://videosmnv.s3.amazonaws.com/CV/minerva/js/parsers/SOLReaderWorker.js");