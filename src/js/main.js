var util = {};
var debug = true;
var googlead = '<span class="googlead"><script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>'+
				'<!-- Minerva Footer 728x90 -->'+
				'<ins class="adsbygoogle"'+
					' style="display:inline-block;width:728px;height:90px"'+
					' data-ad-client="ca-pub-4393629565174725"'+
					' data-ad-slot="3734585686"></ins>'+
				'<script>'+
				'(adsbygoogle = window.adsbygoogle || []).push({});'+
				'</script></span>';
	googlead = ''; // Disabled
				
				
(function() {
	util.zero = function(num) {
		if (num < 10) return '0' + num;
		return num;
	}
	
	util.htmlEntities = function(str) {
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g,'&apos');
	}

	util.formatSize = function(bytes) {
		if (bytes == '?') return bytes;
	
		// Get size precision (number of decimal places from the preferences)
		// and make sure it's within limits.
		var sizePrecision = 2;
		sizePrecision = (sizePrecision > 2) ? 2 : sizePrecision;
		sizePrecision = (sizePrecision < -1) ? -1 : sizePrecision;

		if (sizePrecision == -1) return bytes + " B";

		var a = Math.pow(10, sizePrecision);

		if (bytes == -1 || bytes == undefined) {
			return "-1";
		} else if(bytes == undefined) {
			return "?";
		} else if (bytes == 0) {
			return "0";
		} else if (bytes < 1024) {
			return bytes + " B";
		} else if (bytes < (1024*1024)) {
			return Math.round((bytes/1024)*a)/a + " KB";
		} else {
			return Math.round((bytes/(1024*1024))*a)/a + " MB";
		}
	};
	
	var os;
	util.getOS = function() {
		if (!os) {
			var clientStrings = [
				{s:'Windows 3.11', r:/Win16/, short:'Win'},
				{s:'Windows 95', r:/(Windows 95|Win95|Windows_95)/, short:'Win'},
				{s:'Windows ME', r:/(Win 9x 4.90|Windows ME)/, short:'Win'},
				{s:'Windows 98', r:/(Windows 98|Win98)/, short:'Win'},
				{s:'Windows CE', r:/Windows CE/, short:'Win'},
				{s:'Windows 2000', r:/(Windows NT 5.0|Windows 2000)/, short:'Win'},
				{s:'Windows XP', r:/(Windows NT 5.1|Windows XP)/, short:'Win'},
				{s:'Windows Server 2003', r:/Windows NT 5.2/, short:'Win'},
				{s:'Windows Vista', r:/Windows NT 6.0/, short:'Win'},
				{s:'Windows 7', r:/(Windows 7|Windows NT 6.1)/, short:'Win'},
				{s:'Windows 8.1', r:/(Windows 8.1|Windows NT 6.3)/, short:'Win'},
				{s:'Windows 8', r:/(Windows 8|Windows NT 6.2)/, short:'Win'},
				{s:'Windows NT 4.0', r:/(Windows NT 4.0|WinNT4.0|WinNT|Windows NT)/, short:'Win'},
				{s:'Windows ME', r:/Windows ME/, short:'Win'},
			//	{s:'Android', r:/Android/, short:'Android'},
				{s:'Linux', r:/(Linux|X11)/, short:'Linux'},
			//	{s:'iOS', r:/(iPhone|iPad|iPod)/, short:'iOS'},
				{s:'Mac OS X', r:/Mac OS X/, short:'Mac'},
				{s:'Mac OS', r:/(MacPPC|MacIntel|Mac_PowerPC|Macintosh)/, short:'Mac'},
				{s:'UNIX', r:/UNIX/, short:'Unix'},
			];
			
			for (var id in clientStrings) {
				var cs = clientStrings[id];
				if (cs.r.test(navigator.userAgent)) {
					os = cs;
					break;
				}
			}
		}
		
		return os;
	}
	
	// Prevent large strings from polluting the tree labels
	util.getSnippet = function(val) {
		var str = String(val);
		if (str.length > 15) str = str.substr(0, 15) + '...';
		return str;
	};
})();

$(function () {

	var rotYINT;
	var ny = 0;
	var reader;
	var parser;
	var file;
	var fileType;
	var createNodeContext;
	var showCopyOnce = false;
	var divProgress = document.querySelector('.percent');
	var elFileTitle = $('#title');
	var elJSTree = $('#jstree');
	var elSearch = $('#search_tree');
	var elProgressBar = $('#fileProgressBar');
	var elSOLPath = $('#solPath');
	var elLogo = document.getElementById('logo');

	var btnAbout = $('#about');
	var btnSupport = $('#support');
	var btnNewFile = $('#newFile');
	var btnOpenFile = $('#openFile');
	var btnCloseFile = $('#closeFile');
	var btnImportFile = $('#importFile');
	var btnSaveFile = $('#saveFile');
	var btnExportFile = $('#exportFile');
	var btnCreateNew = $('#btnCreateNew');
	var btnImportJSON = $('#btnImportJSON');
	var btnCreateItem = $('#btnCreateItem');
	var elDetailsPane = $('#details');

	////////////////////
	// Initialization //
	////////////////////
	
	// Set SOL file path //
	var os = util.getOS();
	var path = '<h3>' + os.s + ' Local Shared Object Location</h3>';
	
	// If using the NPAPI legacy Flash Plugin
	path += '<h4>NPAPI: </h4><code>';
	switch (os.short) {
		case 'Win' : path += '%APPDATA%\\Application Data\\Macromedia\\Flash Player\\'; break;
		case 'Mac' : path += '%APPDATA%/Library/Preferences/Macromedia/Flash Player/'; break;
		case 'Linux' : 
		case 'Unix' : path += '~/.macromedia/Flash_Player/'; break; 
		// Gnash
		//case 'Unix' : path += '~/.gnash/SharedObjects/'; break;
		default : path = '';
	}
	path += '</code>';
	
	// If Linux user running Gnash Flash substitute
	// Others: Shumway, Lightspark, don't know paths
	if (os.short == 'Linux' || os.short == 'Unix') {
		path += '<h4>Gnash: </h4><code>~/.gnash/SharedObjects/</code>';
	}
	
	// If using PPAPI Flash Plugin, path is different
	// Chrome, and Opera and probably more in the future use PPAPI
	if (window.chrome) {
		path += '<br/><h4>PPAPI: </h4><code>';
		switch (os.short) {
			case 'Win' : path += '%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Pepper Data\\Shockwave Flash\\WritableRoot\\#SharedObjects\\'; break;
			case 'Mac' : path += '~/Library/Application Support/Google/Chrome/Default/Pepper Data/Shockwave Flash/WritableRoot/#SharedObjects/'; break;
			case 'Linux' : path += '~/.config/google-chrome/Default/Pepper Data/Shockwave Flash/WritableRoot/#SharedObjects/'; break; 
		}
		path += '</code>';
	}
	
	elSOLPath.html(path);
	
	// Check for new version
	if (window.applicationCache) {
		function onUpdateReady() {
			// Browser downloaded a new app cache.
			if (confirm('A new version of this site is available. Load it?')) {
				window.location.reload();
			}
		}

		switch (window.applicationCache.status) {
		  case window.applicationCache.UNCACHED: // UNCACHED == 0
			// A special value that indicates that an application cache object is not fully initialized.
			break;
		  case window.applicationCache.IDLE: // IDLE == 1
			// The application cache is not currently in the process of being updated.
			break;
		  case window.applicationCache.CHECKING: // CHECKING == 2
			// The manifest is being fetched and checked for updates.
			break;
		  case window.applicationCache.DOWNLOADING: // DOWNLOADING == 3
			// Resources are being downloaded to be added to the cache, due to a changed resource manifest.
			break;
		  case window.applicationCache.UPDATEREADY:  // UPDATEREADY == 4
			onUpdateReady();
			break;
		  case window.applicationCache.OBSOLETE: // OBSOLETE == 5
			// The application cache group is now obsolete.
			break;
		  default:
			// Unknown
			break;
		};
		window.applicationCache.addEventListener('updateready', onUpdateReady);
	}
	
	// Check browser support
	function checkFileSaverAPI() {
		var isFileSaverSupported = false;
		try {
			isFileSaverSupported = !!new Blob;
		} catch (e) {}
		return isFileSaverSupported;
	};
	
	// Show any incompatibilities
	var issues = false;
	var msg_array = [];
	var hasOnLine = false;
	// !window.navigator.hasOwnProperty('onLine') doesn't work
	for (var key in window.navigator) {
		if (key == 'onLine') {
			hasOnLine = true;
			break;
		}
	}
	
	if (hasOnLine && !window.navigator.onLine) {
		msg_array.push('<p><strong>.minerva</strong> is now working in offline mode.</p>');
	}
	
	var msg_error_prefix = '<p>It appears your browser does not support:</p><ul>';
	var msg_error = '';
	if (!hasOnLine) {
		msg_error += '<li>Navigator.onLine API - Used to take check if application is offline/online</li>';
		issues = true;
	};
	if (!window.applicationCache) {
		msg_error += '<li>Application Cache API - Used to take the application offline</li>';
		issues = true;
	};
	if (!window.JSON) {
		msg_error += '<li>JSON API - Used to pass data</li>';
		issues = true;
	};
	if (!window.FileReader) {
		msg_error += '<li>FileReader API - Used to read user files</li>';
		issues = true;
	};
	if (!checkFileSaverAPI()) {
		msg_error += '<li>Blob API - Used to save generated files</li>';
		issues = true;
	};
	if (!window.Worker) {
		msg_error += '<li>JavaScript Workers - Used to process SOL files</li>';
		issues = true;
	};
	msg_error += '</ul><p>Please upgrade your browser in order to use <strong>.minerva</strong>.</p>';
	if (issues) msg_array.push(msg_error_prefix + msg_error);
	
	// Alert safari users of issues
	if (navigator.userAgent.search("Safari") >= 0 && navigator.userAgent.search("Chrome") < 0) {
		msg_array.push('<p>Hello Safari user, please be aware that Safari does not handle downloading generated files very well...at all. The files (Blobs) may be opened instead of saved sometimes. Please manually press &#8984;+S to save the file after it is opened.</p>');
	};
	
	// Alert Chrome x64 users of issues
	// Chrome x64 dies when using Array.apply on large array
	// https://code.google.com/p/chromium/issues/detail?id=252492
	if (navigator.userAgent.indexOf('x64') != -1 && navigator.userAgent.indexOf('Chrome') != -1) {
		msg_array.push('<p>Hello Chrome x64 user, please be aware that Chrome x64 does not handle converting large arrays within web workers. It will error out before completing, leaving you with an empty file. Please use either Firefox, Chrome x32, or another modern browser until this bug is fixed. <a style="text-decoration:underline;"  href="https://code.google.com/p/chromium/issues/detail?id=252492" target="_blank">Chrome Bug #252492</a></p>');
	}
	
	if (msg_array.length > 0) Alert.show(msg_array.join('<hr/>'), Alert.NOTICE);
	
	// Pinned Site detection
	try {
		if (window.external.msIsSiteMode()) {
			// Site mode is supported and active.
			//initThumbBar();
		} else {
			// Site mode is supported, but inactive.
			$('#divPinSite').show();
			$('#divPinSite').bind('click', function() {
				$('#divPinSite').hide();
			});
		}
	} catch (e) {
		// Site mode is not supported.
	}
	
	////////////////
	// Navigation //
	////////////////
	function tree2Obj(o, data, callState) {
		var count = 0, key;
		for (key in data) {
			var child = data[key],
				type = (callState == 'TreeNode') ? child.data.__traits.type : child.__traits.type,
				value = (callState == 'TreeNode') ? child.data.value : child.value,
				keyValue = (callState == 'Dictionary') ? child.key : null;
			key = (callState == 'Array' || callState == 'Dictionary') ? parseInt(key) : (callState == 'Object') ? String(key) : child.text;
			switch (type) {
				case 'Integer' :
				case 'Number' :
				case 'Boolean' :
				case 'String' :
				case 'ByteArray' :
				case 'XML' :
				case 'Date' :
				case 'Null' :
				case 'Undefined' :
					o[key] = value;
					break;
				case 'Array':
					if (value.length != child.children.length) {
						// ECMA Array
						// Since an associative array in JavaScript is an object, 
						// we have to convert this into an object
						o[key] = tree2Obj({}, value, 'Object');
						o[key] = tree2Obj(o[key], child.children, 'TreeNode');
					} else {
						// Array
						o[key] = tree2Obj([], value, 'Array');
					}
					break;
				case 'Object':
				case 'Vector':
					o[key] = tree2Obj({}, value, 'Object');
					break;
				case 'Dictionary':
					o[key] = tree2Obj([], value, 'Dictionary');
					break;
				case 'DictionaryItem':
					o[key] = tree2Obj({}, { Key:child.key, Value:child.value }, 'Object');
					count++;
					break;
			}
		}
		
		return o;
	};
	
	function tree2SOL(o, data, callState) {
		var key, child, type, value;
		for (key in data) {
			child = data[key];
			type = child.data.__traits.type;
			value = child.data.value;
			key = child.text;
			
			//console.log('tree2SOL', key, type, value, child);
			switch (type) {
				case 'Integer' :
				case 'Number' :
				case 'Boolean' :
				case 'String' :
				case 'ByteArray' :
				case 'XML' :
				case 'Date' :
				case 'Null' :
				case 'Undefined' :
					o[key] = child.data;
					break;
				case 'Vector':
				case 'Dictionary':
				case 'Array':
					if (child.data.__traits.origType == 'ECMAArray') {
						// ECMA Array
						o[key] = {};
						o[key].__traits = child.data.__traits;
						o[key].value = tree2SOL({}, child.children, type);
					} else {
						// Array
						o[key] = {};
						o[key].__traits = child.data.__traits;
						o[key].value = tree2SOL([], child.children, type);
					}
					break;
				case 'Object':
					o[key] = {};
					o[key].__traits = child.data.__traits;
					o[key].value = tree2SOL({}, child.children, 'Object');
					break;
				case 'DictionaryItem':
					var l = o.length;
					o[l] = {};
					o[l].__traits = child.data.__traits;
					//o[l].value = tree2SOL({}, { Key:child.data.value.key, Value:child.data.value.value }, 'Object');
					o[l].value = tree2SOL({}, { Key:child.children[0], Value:child.children[1] }, 'Object');
					break;
			}
		}
		
		return o;
	};
	
	btnNewFile.on('click', function(event) {
		$('#overlay').addClass('show');
		$('#newWindow').addClass('show');
	});
	btnOpenFile.on('click', function(event) {
		$('#overlay').addClass('show');
		$('#openWindow').addClass('show');
	});
	btnImportFile.on('click', function(event) {
		$('#overlay').addClass('show');
		$('#importJSONWindow').addClass('show');
	});
	btnExportFile.on('click', function(event) {
		if (btnExportFile.hasClass('disabled')) return;
		
		var treeJSON = elJSTree.jstree("get_json");
		
		try {
			var o = tree2Obj({}, treeJSON[0].children, 'TreeNode');
		} catch(e) {
			console.log(e);
		}
		
		var json = JSON.stringify(o);
		if (debug) console.log(json, o);
		
		var fileName = file.name,
			blob = new Blob([json], {type: "text/plain;charset=" + document.characterSet});
		if (fileName.indexOf('.sol') != -1) fileName = fileName.slice(0, -4);
		saveAs(blob, (fileName || 'JSON Export'));
	});
	btnSaveFile.on('click', function(event) {
		if (btnSaveFile.hasClass('disabled')) return;
		
		var treeJSON = elJSTree.jstree("get_json");
		
		$('#overlay').addClass('show');
		$('#saveWindow').addClass('show');
		
		try {
			var o = {};
			o.__traits = treeJSON[0].data.value;
			o.__traits2 = treeJSON[0].data.value2;
			o.value = tree2SOL({}, treeJSON[0].children, 'TreeNode');
		} catch(e) {
			console.log(e);
		}
		
		if (debug) console.log(treeJSON[0]);
		parser.serialize(treeJSON[0], o, file, onFileAssembled);
	});
	btnCloseFile.on('click', closeFile);
	btnSupport.on('click', function(event) {
		window.open("https://code.google.com/p/cv-minerva/issues/list", "minerva_issues");
	});
	
	function onFileAssembled(data) {
		if (debug) console.log('onFileAssembled');
		if (debug) console.log(data);
		if (data.hasOwnProperty('icon') && data.icon == 'error') {
			$('#overlay').removeClass('show');
			$('#saveWindow').removeClass('show');
			
			Alert.show(data.text, Alert.ERROR);
		} else {
			var bin = new Int8Array(data);
			var blob = new Blob([bin], {type: 'application/octet-stream'});
			saveAs(blob, file.name);
			
			$('#overlay').removeClass('show');
			$('#saveWindow').removeClass('show');
		}
	}
	
	function closeFile() {
		if (btnCloseFile.hasClass('disabled')) return;

		// Disable close button
		btnCloseFile.addClass('disabled');
		btnSaveFile.addClass('disabled');
		btnExportFile.addClass('disabled');

		// Reset
		elJSTree.jstree("destroy");
		elSearch.val('');
		elFileTitle.html('');
		resetDetails();

		// Reset vars
		reader = fileType = parser = null;
	};
	
	///////////
	// About //
	///////////
	btnAbout.on('click', function(event) {
		$('#aboutOverlay').addClass('show');
		$('#aboutWindow').addClass('show');
		rotateYDIV();
	});
	
	// Close button
	$('#aboutOverlay .close-top').on('click', function(event) {
		$('#aboutOverlay').removeClass('show');
		$('#aboutWindow').removeClass('show');
		clearInterval(rotYINT);
	});
	
	function rotateYDIV() {
		clearInterval(rotYINT);
		rotYINT = setInterval(startYRotate, 10);
	};
	
	function startYRotate() {
		ny = ny + 0.5;
		elLogo.style.transform = "rotateY(" + ny + "deg)";
		elLogo.style.webkitTransform = "rotateY(" + ny + "deg)";
		elLogo.style.OTransform = "rotateY(" + ny + "deg)";
		elLogo.style.MozTransform = "rotateY(" + ny + "deg)";
		if (ny == 180 || ny >= 360) {
			//clearInterval(rotYINT);
			if (ny >= 360) ny = 0;
		};
	};
	
	////////////
	// Modals //
	////////////
	var btnCancelFile = $('#btnFileCancel');
	
	$('#overlay .close-top').on('click', function(event) {
		closeModal();
	});
	
	// New Window
	var elNewNameValue = $('#txtNewName');
	var elAMFValue = $('#radAMFValue');
	elNewNameValue.on('input propertychange', function(event/*:KeyBoardEvent */)/*:void */ {
		elNewNameValue.removeClass('error');
	});
	
	btnCreateNew.on('click', function(event) {
		var fileName = elNewNameValue.val();
		var amfType = elAMFValue.find(':checked').val();
		
		if (fileName == '') {
			Alert.show('Please enter a file name.', Alert.NOTICE);
			elNewNameValue.addClass('error');
			return;
		}
		
		// Reset for new file
		closeFile();
		
		// Remove error coloring
		elNewNameValue.removeClass('error');
		
		var sol = {};
		sol.header = {};
		sol.header.amfVersion = parseInt(amfType);
		sol.header.dataLength = '?';
		sol.header.fileName = fileName;
		sol.fileName = fileName + '.sol';
		sol.fileSize = 0;
		parser = new SOL();
		sol.body = {'Hello':{ __traits:{type:'String'}, value:'World' }};
		if (debug) console.log(sol);
		var tree = parser.obj2Tree(sol);
		if (debug) console.log(sol);
		
		// Convert sol to the display tree
		file = { name:sol.fileName, size:sol.fileSize };
		updateSidebar(tree, file);
	
		// Hide Overlay
		closeModal();
		
		// Reset
		elNewNameValue.val('NewFile');
		elAMFValue.filter('[value=3]').prop('checked', true);
		
		btnCloseFile.removeClass('disabled');
		btnSaveFile.removeClass('disabled');
		btnExportFile.removeClass('disabled');
	});
	
	// Open Window
	$('#filesFile').on('change', function(event) {
		var files = event.target.files; // FileList object

		if (!files.length) {
			Alert.show('Please select a file first!', Alert.NOTICE);
			return;
		}
		
		// Show cancel while reading
		btnCancelFile.addClass('show');
	
		// Reset for new file
		closeFile();
		
		var t = this;
		file = files[0]; // Read only first file
		var ext = file.name.toLowerCase().slice(-3);
		if (debug) console.log('File: ', file);

		// Determine file type
		switch (ext) {
			case 'sol' :
				parser = new SOL();
				break;
			default :
				Alert.show('Invalid file type!', Alert.ERROR);
				return;
		}
		
		// Title before parsing
		updateSidebar(null, file);
		
		reader = new FileReader();
		reader.onerror = errorHandler;
		reader.onprogress = updateProgress;
		reader.onabort = function (e) {
			Alert.show('File read cancelled.', Alert.INFO);
		};
		reader.onloadstart = function (e) {
			// Reset progress indicator on new file selection
			divProgress.style.width = '0%';
			divProgress.textContent = '0%';
			elProgressBar.addClass('loading');
		};
		reader.onloadend = function (e) {
			// Ensure that the progress bar displays 100% at the end
			divProgress.style.width = '100%';
			divProgress.textContent = '100%';
			setTimeout(function() {
				elProgressBar.removeClass('loading');
				btnCancelFile.removeClass('show');
			}, 250);
			setTimeout(closeModal, 500);
		};
		reader.onload = function (e) {
			parser.deserialize(e.target.result, file, updateSidebar);
		};

		reader.readAsArrayBuffer(file);

		btnCloseFile.removeClass('disabled');
		btnSaveFile.removeClass('disabled');
		btnExportFile.removeClass('disabled');
	});
	
	btnCancelFile.on('click', function(event) {
		if (reader) reader.abort();
	});
	
	function updateProgress(e/*:ProgressEvent*/) {
		if (e.lengthComputable) {
			var percentLoaded = Math.round((e.loaded / e.total) * 100);
			if (percentLoaded < 100) {
				divProgress.style.width = percentLoaded + '%';
				divProgress.textContent = percentLoaded + '%';
			}
		}
	};
	
	function errorHandler(e) {
		var err = e.target.error;
		switch (err.code) {
			case err.NOT_FOUND_ERR:
				Alert.show('File Not Found!', Alert.ERROR);
				break;
			case err.NOT_READABLE_ERR:
				Alert.show('File is not readable!', Alert.ERROR);
				break;
			case err.ABORT_ERR:
				break; // noop
			default:
				Alert.show('An error occurred reading this file.<code>' + error.message + '<br>(' + error.filename + ':' + error.lineno + ')</code>', Alert.ERROR);
		};
	};
	
	// Open Binary Window
	var elProgressBarBinary = $('#binProgressBar');
	var btnCancelBinary = $('#btnBinCancel');
	var elProgressBinary = elProgressBarBinary.find('.percent');
	var binaryReader;
	$('#filesBinary').on('change', function(event) {
		var files = event.target.files; // FileList object

		if (!files.length) {
			Alert.show('Please select a file first!', Alert.NOTICE);
			return;
		}
		
		// Show cancel while reading
		btnCancelBinary.addClass('show');
		
		var t = this;
		
		binaryReader = new FileReader();
		binaryReader.onerror = errorHandler;
		binaryReader.onprogress = updateProgressBinary;
		binaryReader.onabort = function (e) {
			Alert.show('File read cancelled.', Alert.INFO);
		};
		binaryReader.onloadstart = function (e) {
			// Reset progress indicator on new file selection
			elProgressBinary.css('width', '0%');
			elProgressBinary.text('0%');
			elProgressBarBinary.addClass('loading');
		};
		binaryReader.onloadend = function (e) {
			// Ensure that the progress bar displays 100% at the end
			elProgressBinary.css('width', '100%');
			elProgressBinary.text('100%');
			setTimeout(function() {
				elProgressBarBinary.removeClass('loading');
				btnCancelBinary.removeClass('show');
			}, 250);
			setTimeout(closeModal, 500);
		};
		binaryReader.onload = function (e) {
			byteArrayView.baImport2(e.target.result, file);
		};

		binaryReader.readAsArrayBuffer(file);
	});
	
	btnCancelBinary.on('click', function(event) {
		if (binaryReader) binaryReader.abort();
	});
	
	function updateProgressBinary(e/*:ProgressEvent*/) {
		if (e.lengthComputable) {
			var percentLoaded = Math.round((e.loaded / e.total) * 100);
			if (percentLoaded < 100) {
				elProgressBinary.css('width', percentLoaded + '%');
				elProgressBinary.text(percentLoaded + '%');
			}
		}
	};
	
	// Import Window
	// { "myBool":false, "myDate":"12345", "myFloat":3.141592653589793, "myInt":7, "myIntArray":[1,2,3], "myNull":null, "myString":"ralle", "myObject":{"p1":5, "p2":6}}
	var elJSONNameValue = $('#txtJSONName');
	var elJSONValue = $('#txtJSONValue');
	elJSONNameValue.on('input propertychange', function(event/*:KeyBoardEvent */)/*:void */ {
		elJSONNameValue.removeClass('error');
	});
	elJSONValue.on('input propertychange', function(event/*:KeyBoardEvent */)/*:void */ {
		elJSONValue.removeClass('error');
	});
	
	btnImportJSON.on('click', function(event) {
		var fileName = elJSONNameValue.val();
		var jsonVal = elJSONValue.val();
		
		if (fileName == '') {
			Alert.show('Please enter a file name.', Alert.NOTICE);
			elJSONNameValue.addClass('error');
			return;
		}
		if (jsonVal == '') {
			Alert.show('Please enter valid JSON.', Alert.NOTICE);
			elJSONValue.addClass('error');
			return;
		}
		
		// Remove error coloring
		elJSONNameValue.removeClass('error');
		elJSONValue.removeClass('error');
		
		// Attempt to read JSON
		try {
			var o = JSON.parse(jsonVal);

			// Handle non-exception-throwing cases:
			// Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
			// but... JSON.parse(null) returns 'null', and typeof null === "object", 
			// so we must check for that, too.
			if (o && typeof o === "object" && o !== null) {
				// Reset for new file
				closeFile();
				
				// Convert to SOL
				var sol = {};
				sol.header = {};
				sol.header.amfVersion = 3;
				sol.header.dataLength = '?';
				sol.header.fileName = fileName;
				sol.fileName = fileName + '.sol';
				sol.fileSize = '?';
				parser = new SOL();
				sol.body = formatChildren(o);
				if (debug) console.log(sol);
				var tree = parser.obj2Tree(sol);
				if (debug) console.log(sol);
				// Convert sol to the display tree
				file = { name:sol.header.fileName, size:sol.fileSize };
				updateSidebar(tree, file);
			} else {
				Alert.show('Invalid JSON, base data is not an object.', Alert.ERROR);
				elJSONValue.addClass('error');
				return;
			}
		} catch (error) {
			console.error(error);
			Alert.show('Invalid JSON:<code>' + error.message + '<br>(' + error.filename + ':' + error.lineno + ')</code>', Alert.ERROR);
			elJSONValue.addClass('error');
			return;
		};
		
		// Hide Overlay
		closeModal();
		
		// Reset
		elJSONNameValue.val('');
		elJSONValue.val('');
		
		btnCloseFile.removeClass('disabled');
		btnSaveFile.removeClass('disabled');
		btnExportFile.removeClass('disabled');
	});
	
	// Create Window
	btnCreateItem.on('click', function(event) {
		/*
		String
		Number
		Integer
		Object
		Array
		Vector
		Dictionary
		*/
		var tree = $.jstree.reference(createNodeContext),
			par_node = tree.get_node(createNodeContext),
			key,
			value,
			label = $('#txtNewLabel').val(),
			json = $('#txtNewValue').val();
			
		if (label == '' || label.length == 0) {
			Alert.show('Please enter a valid name for the new property', Alert.NOTICE);
			$('#txtNewLabel').addClass('error');
			return;
		}
		
		$('#txtNewLabel').removeClass('error');
		
		// Reset form
		$('#txtNewLabel').val('');
		$('#txtNewValue').val('');
		
		// Hide Overlay
		closeModal();
		
		try {
			// Parse the value into an object if it's complex data
			try {
				value = JSON.parse(json);
			} catch (error1) {
				value = json;
			}
			// Is a date?
			if (Date.parse(value) && typeof value == "string") value = new Date(value);
			
			var valueType = getDataType(value);
			value = formatObject(value);
			if (debug) console.log('value', value, valueType);
			
			// Guess the type of data that was input
			// If creating a dictionary item, parse label input
			if (par_node.data.__traits.type == 'Dictionary') {
				try {
					key = JSON.parse(label);
				} catch (error1) {
					key = label;
				}
				// Is a date?
				if (Date.parse(key) && typeof key == "string") key = new Date(key);
				var val = { key:formatObject(key), value:value, __traits:{ type:'DictionaryItem' } };
				value = val;
				label = '';
				if (debug) console.log('value2', value, valueType);
			}
			if (debug) console.log('label', label);
			
			// Create a node object based on parent and input
			var o = parser.createNode(par_node.data.__traits.type, par_node.children.length, par_node.data.__traits.class, label, value, valueType);
			if (typeof o != 'string') {
				if (debug) console.log('new node', o);
				tree.create_node(par_node, o, "last", function (new_node) {
					setTimeout(function () { tree.select_node(new_node); },0);
				});
			} else {
				// Error message
				Alert.show(o, Alert.ERROR);
				//Alert.show('Error creating node:<code>' + error.message + '<br>(' + error.filename + ':' + error.lineno + ')</code>', Alert.ERROR);
			}
		} catch (error) {
			Alert.show('Error creating node:<code>' + error.message + '<br>(' + error.filename + ':' + error.lineno + ')</code>', Alert.ERROR);
			console.error(error);
		};
	});
	
	function closeModal() {
		$('#overlay').removeClass('show');
		$('#newWindow').removeClass('show');
		$('#openWindow').removeClass('show');
		$('#createWindow').removeClass('show');
		$('#importBinaryWindow').removeClass('show');
		$('#importJSONWindow').removeClass('show');
		elJSONNameValue.val('');
		elJSONValue.val('');
		elJSONNameValue.removeClass('error');
		elJSONValue.removeClass('error');
	}

	/////////////
	// Sidebar //
	/////////////
	
	var solView = new SOLView();
	var arrayView = new ArrayView();
	var booleanView = new BooleanView();
	var objectView = new ObjectView();
	var dictionaryView = new DictionaryView();
	var numberView = new NumberView();
	var integerView = new IntegerView();
	var xmlView = new XMLView();
	var stringView = new StringView();
	var vectorView = new VectorView();
	var dateView = new DateView();
	var byteArrayView = new ByteArrayView();
	var dictionaryItemView = new DictionaryItemView();
	
	var search_delay = false;
	elSearch.keyup(function (event) {
		// Clear on ESC
		if (event.which == 27) elSearch.val('');
		
		if (!elJSTree.jstree(true).search) return;
		if (search_delay) clearTimeout(search_delay);
		search_delay = setTimeout(function () {
			var v = elSearch.val();
			elJSTree.jstree(true).search(v);
		}, 250);
	});
	
	function getDataType(val) {
		var type = typeof val;
		if (debug) console.log('getDataType', type, Object.prototype.toString.call(val));
		switch (typeof val) {
			case 'boolean': 
				if (parser.getAMFVersion() == 3) {
					type = val ? 'True' : 'False';
				} else {
					type = 'Boolean';
				}break;
			case 'number': type = 'Number'; break;
			case 'string': type = 'String'; break;
			case 'object': type = 'Object'; break;
		};
		
		// Is XML?
		var xmlParser = new DOMParser(), dom = xmlParser.parseFromString(val, "text/xml");
		if (dom.documentElement.nodeName != "parsererror" && type == 'String') type = 'XML';
		if (type == 'Number' && (val % 1 === 0) && parser.getAMFVersion() == 3) type = 'Integer';
		if (type == 'Object' && val == null) type = 'Null';
		if (type == 'Object' && Object.prototype.toString.call(val) === '[object Array]') type = 'Array';
		if (type == 'Object' && Object.prototype.toString.call(val) === '[object Date]') type = 'Date';
		
		return type;
	}
	
	function formatChildren(o/*:Object*/) {
		var obj = { };
		for (var prop in o) {
			obj[prop] = formatObject(o[prop]);
		}
		return obj;
	}
	
	function formatObject(val) {
		var type = getDataType(val.value ? val.value : val);
		if (type == 'Object') {
			var traits = { type:type };
			if (parser.getAMFVersion() == 3) {
				traits = { 
					type:type, 
					class:type, 
					members:[], 
					count:0, 
					externalizable:false, 
					dynamic:true
				};
			};
			return { __traits:traits, value:formatChildren(val) };
		} else if (type == 'Array') {
			return { __traits:{type:type}, value:formatChildren(val) };
		} else {
			return { __traits:{type:type}, value:val };
		};
	};
	
	function updateSidebar(json, file) {
		// Title after parsing
		elFileTitle.html(parser ? parser.getTitle(file) : '');
		
		// Populate tree
		if (!json) json = {text:'Parsing file...', icon:'time'};
		//console.log('JSON Tree', json);
		elJSTree.jstree("destroy");
		$.jstree.defaults.core.themes.dots = true;
		$.jstree.defaults.core.themes.stripes = true;
		$.jstree.defaults.search.show_only_matches = true;
		$.jstree.defaults.search.search_callback = searchTreeNodes;
		$.jstree.defaults.plugins = [ "contextmenu", "sort", "search" ];
		$.jstree.defaults.sort = naturalSort;
		
		$.jstree.defaults.contextmenu.items = function (o, cb) { // Could be an object directly
			return {
				"create" : {
					"separator_before"	: false,
					"separator_after"	: true,
					"_disabled"			: function (data) {
						var tree = $.jstree.reference(data.reference),
							obj = tree.get_node(data.reference);
						return !(obj.data && obj.data.__traits && obj.data.__traits.canCreate !== false);
					},
					"label"				: "Create",
					"action"			: function (data) {
						var tree = $.jstree.reference(data.reference),
							obj = tree.get_node(data.reference);
						if (debug) console.log('on create action', obj);
						// If this object is indexed, lock label to child count
						if (obj.data.__traits.isIndexed) {
							$('#txtNewLabel').val(obj.children.length);
							$('#txtNewLabel').prop('disabled', true);
						} else {
							$('#txtNewLabel').prop('disabled', false);
						}
						
						// If this object CAN be indexed, fill label to child count
						if (obj.data.__traits.canBeIndexed) {
							$('#txtNewLabel').val(obj.children.length);
						}
						
						createNodeContext = data.reference;
						
						$('#overlay').addClass('show');
						$('#createWindow').addClass('show');
					}
				},
				"rename" : {
					"separator_before"	: false,
					"separator_after"	: false,
					"_disabled"			: function (data) {
						var tree = $.jstree.reference(data.reference),
							obj = tree.get_node(data.reference);
						return !(obj.data && obj.data.__traits && obj.data.__traits.canRename !== false);
					},
					"label"				: "Rename",
					/*"shortcut"			: 113,
					"shortcut_label"	: 'F2',
					"icon"				: "glyphicon glyphicon-leaf",*/
					"action"			: function (data) {
						var tree = $.jstree.reference(data.reference),
							obj = tree.get_node(data.reference);
						edit_node(tree, obj);
					}
				},
				"remove" : {
					"separator_before"	: false,
					"icon"				: false,
					"separator_after"	: false,
					"_disabled"			: function (data) {
						var tree = $.jstree.reference(data.reference),
							obj = tree.get_node(data.reference);
						return !(obj.data && obj.data.__traits && obj.data.__traits.canDelete !== false);
					},
					"label"				: "Delete",
					/*"shortcut"			: 46,
					"shortcut_label"	: 'Del',
					"icon"				: "glyphicon glyphicon-trash",*/
					"action"			: function (data) {
						var inst = $.jstree.reference(data.reference),
							obj = inst.get_node(data.reference);
						delete_node(inst, obj);
					}
				},
				"ccp" : {
					"separator_before"	: true,
					"icon"				: false,
					"separator_after"	: false,
					"_disabled"			: function (data) {
						var tree = $.jstree.reference(data.reference),
							obj = tree.get_node(data.reference);
						if (debug) console.log("ccp", obj.data);
						return !(obj.data && obj.data.__traits && obj.data.__traits.canEdit !== false);
					},
					"label"				: "Edit",
					"action"			: false,
					"submenu" : {
						"cut" : {
							"separator_before"	: false,
							"separator_after"	: false,
							"label"				: "Cut",
							/*"shortcut"			: 'ctrl-88',
							"shortcut_label"	: 'Ctrl+X',
							"icon"				: "glyphicon glyphicon-trash",*/
							"action"			: function (data) {
								var inst = $.jstree.reference(data.reference),
									node = inst.get_node(data.reference);
								cut_node(inst, node);
							}
						},
						"copy" : {
							"separator_before"	: false,
							"icon"				: false,
							"separator_after"	: false,
							"label"				: "Copy",
							/*"shortcut"			: 'ctrl-67',
							"shortcut_label"	: 'Ctrl+C',
							"icon"				: "glyphicon glyphicon-trash",*/
							"action"			: function (data) {
								var inst = $.jstree.reference(data.reference),
									node = inst.get_node(data.reference);
									copy_node(inst, node);
							}
						},
						"paste" : {
							"separator_before"	: false,
							"icon"				: false,
							"_disabled"			: function (data) {
								// If local storage is available
								return !(window.localStorage && localStorage.getItem("clipboard"));
								// If local storage isn't available
								return !(!window.localStorage && $.jstree.reference(data.reference).can_paste());
							},
							"separator_after"	: false,
							"label"				: "Paste",
							/*"shortcut"			: 'ctrl-86',
							"shortcut_label"	: 'Ctrl+V',
							"icon"				: "glyphicon glyphicon-trash",*/
							"action"			: function (data) {
								var inst = $.jstree.reference(data.reference),
									par = inst.get_node(data.reference);
								paste_node(inst, par);
							}
						}
					}
				}
			};
		};
		
		elJSTree.jstree({
			'core': {
				'data': [json],
				// so that create works
				'check_callback': true
			}
		});
		
		function cut_node(tree, node) {
			var par_node = tree.get_node(node.parent);
			if (node.data && node.data.__traits && node.data.__traits.canDelete !== false && 
				((par_node.data && par_node.data.__traits) ? par_node.data.__traits.fixed !== true : true)) {
				if (node && node.id && node.id !== '#') {
					
					if (window.localStorage) {
						var json = JSON.stringify(tree.get_json(node, { flat:false, no_id:true, no_state:true }));
						tree.delete_node(node);
						if (debug) console.log('cut', json);
						localStorage.setItem("clipboard", json);
					} else {
						if (!showCopyOnce) {
							Alert.show('Sorry, your browser does not support localStorage. You will not be able to move this node between tabs or windows.', Alert.INFO);
							showCopyOnce = true;
						}
						node = tree.is_selected(node) ? tree.get_selected() : node;
						tree.cut(node);
					}
					
					// Check if parent is an array type and renumber children
					if (par_node.data && par_node.data.__traits && par_node.data.__traits.canBeIndexed) {
						for (var i = 0, l = par_node.children.length; i < l; i++) {
							var child = tree.get_node(par_node.children[i]);
							if (par_node.data.__traits.type == 'Dictionary') {
								tree.rename_node(child, 'Item ' + i.toString());
							} else {
								tree.rename_node(child, i.toString());
							}
						}
					}
				}
			}
		}
		
		function copy_node(tree, node) {
			if (node && node.id && node.id !== '#') {
				if (window.localStorage) {
					var json = JSON.stringify(tree.get_json(node, { flat:false, no_id:true, no_state:true }));
					if (debug) console.log('copy', json);
					localStorage.setItem("clipboard", json);
				} else {
					if (!showCopyOnce) {
						Alert.show('Sorry, your browser does not support localStorage. You will not be able to move this node between tabs or windows.', Alert.INFO);
						showCopyOnce = true;
					}
					node = tree.is_selected(node) ? tree.get_selected() : node;
					tree.copy(node);
				}
			}
		}
		
		function paste_node(tree, node) {
			if (node.data && node.data.__traits && node.data.__traits.canCreate !== false && node.data.__traits.fixed !== true) {
				if (window.localStorage) {
					var json = localStorage.getItem("clipboard"),
						nodeChild = JSON.parse(json);
					if (debug) console.log('paste', nodeChild);
					// create_node(node, nodeChild, pos, callback, is_loaded)
					tree.create_node(node, nodeChild, "last", function (new_node) {
						//new_node.data = json.original.data;
						setTimeout(function () { tree.select_node(new_node); },0);
					});
					
					// Clear clipboard
					//localStorage.removeItem("clipboard");
				} else {
					tree.paste(node);
				}
				
				// Check if parent is an array type and renumber children
				if (node.data && node.data.__traits && node.data.__traits.canBeIndexed) {
					for (var i = 0, l = node.children.length; i < l; i++) {
						var child = tree.get_node(node.children[i]);
						if (node.data.__traits.type == 'Dictionary') {
							tree.rename_node(child, 'Item ' + i.toString());
						} else {
							tree.rename_node(child, i.toString());
						}
					}
				}
			}
		}
		
		function edit_node(tree, node) {
			if (node.data && node.data.__traits && node.data.__traits.canRename !== false) {
				if (node && node.id && node.id !== '#') {
					tree.edit(node);
				}
			}
		}
		
		function delete_node(tree, node) {
			var par_node = tree.get_node(node.parent);
			if (node.data && node.data.__traits && node.data.__traits.canDelete !== false && 
				((par_node.data && par_node.data.__traits) ? par_node.data.__traits.fixed !== true : true)) {
				if (node && node.id && node.id !== '#') {
					node = inst.is_selected(node) ? inst.get_selected() : node;
					tree.delete_node(node);
					
					// Check if parent is an array type and renumber children
					if (par_node.data && par_node.data.__traits && par_node.data.__traits.canBeIndexed) {
						for (var i = 0, l = par_node.children.length; i < l; i++) {
							var child = tree.get_node(par_node.children[i]);
							if (par_node.data.__traits.type == 'Dictionary') {
								tree.rename_node(child, 'Item ' + i.toString());
							} else {
								tree.rename_node(child, i.toString());
							}
						}
					}
				}
			}
		}
		
		// triggered when selection changes
		var inst = $.jstree.reference('#jstree');
		elJSTree.on("changed.jstree", onTreeChange);
		elJSTree.on('keydown.jstree', '.jstree-anchor', function (e) {
			if (e.target.tagName === "INPUT") { return true; }
			var node = null;
			/*if (inst._data.core.rtl) {
				if (e.which === 37) { e.which = 39; }
				else if (e.which === 39) { e.which = 37; }
			}*/
			switch (e.which) {
				// Cut Ctrl+X
				case 88:
					if (e.ctrlKey) {
						e.preventDefault();
						node = inst.get_node(e.currentTarget);
						cut_node(inst, node);
					}
					break;
				// Copy Ctrl+C
				case 67:
					if (e.ctrlKey) {
						e.preventDefault();
						node = inst.get_node(e.currentTarget);
						copy_node(inst, node);
					}
					break;
				// Paste Ctrl+V
				case 86:
					if (e.ctrlKey) {
						e.preventDefault();
						node = inst.get_node(e.currentTarget);
						paste_node(inst, node);
					}
					break;
				// Delete
				case 46:
					e.preventDefault();
					node = inst.get_node(e.currentTarget);
					delete_node(inst, node);
					break;
				// F2
				case 113:
					e.preventDefault();
					node = inst.get_node(e.currentTarget);
					edit_node(inst, node);
					break;
				default:
					//console.log(e.which);
					break;
			}
		});
	}
	
	function searchTreeNodes(search, node) {
		if (node.data === null) return false; // Title node
		// Not case sensitive
		var label = node.text.toLowerCase();
		var val = String(node.data.value).toLowerCase();
		return label.indexOf(search) !== -1 || val.indexOf(search) !== -1;
	}
	
	function naturalSort(a, b) {
		a = this.get_text(a);
		b = this.get_text(b);
		function chunkify(t) {
			var tz = [], x = 0, y = -1, n = 0, i, j;

			while (i = (j = t.charAt(x++)).charCodeAt(0)) {
				var m = (i == 46 || (i >=48 && i <= 57));
				if (m !== n) {
					tz[++y] = "";
					n = m;
				}
				tz[y] += j;
			}
			return tz;
		}

		var aa = a ? chunkify(a) : [];
		var bb = b ? chunkify(b) : [];

		for (x = 0; aa[x] && bb[x]; x++) {
			if (aa[x] !== bb[x]) {
				var c = Number(aa[x]), d = Number(bb[x]);
				if (c == aa[x] && d == bb[x]) {
					return c - d;
				} else return (aa[x] > bb[x]) ? 1 : -1;
			}
		}
		return aa.length - bb.length;
	}
	
	function onValueChange(input, node) {
		// if node isn't passed, get current node
		//if (!node) node = data.instance.get_node(data.selected[0]);
		if (debug) console.log('onValueChange', input, node);
		
		// If integer/number update the icon and title
		if (node.data.__traits.type == 'Integer' || node.data.__traits.type == 'Number') {
			var tree = $.jstree.reference('#jstree');
			tree.set_icon(node, node.data.__traits.type.toLowerCase());
		}
		
		// If amf3 boolean update the icon and title
		if (node.data.__traits.origType == 'False' || node.data.__traits.origType == 'True') {
			var tree = $.jstree.reference('#jstree');
			tree.set_icon(node, node.data.__traits.origType.toLowerCase());
			//node.li_attr.title = node.data.__traits.origType;
			tree.get_node(node.id).li_attr.title = node.data.__traits.origType;
			//node.getAttr().put("title", node.data.__traits.origType);
		}
		
		if (node) node.data.value = input;
	};
	
	function onTraitChange(input, node) {
		// if node isn't passed, get current node
		//if (!node) node = data.instance.get_node(data.selected[0]);
		if (debug) console.log('onTraitChange', input, node);
		if (node) node.data.__traits = input;
	};
	
	function onTreeChange(e, data) {
		if (debug) console.log('onTreeChange', e, data);
		if (data.action == 'delete_node') return;
	
		if (data.action == 'select_node') {
			// data.node, data.action, data.selected, data.event, data.instance
			resetDetails();
			
			var node = data.node;//instance.get_node(data.selected[0]);
			var lower_type = node.data.__traits.type ? node.data.__traits.type.toLowerCase() : '';
			switch (lower_type) {
				case 'localsharedobject' :
					solView.init(elDetailsPane, node, file, node.data.value, node.data.value2);
					break;
				case 'array':
					arrayView.init(elDetailsPane, node, node.data.value, onValueChange);
					break;
				case 'object':
					objectView.init(elDetailsPane, node, node.data.value, onTraitChange);
					break;
				case 'dictionary':
					dictionaryView.init(elDetailsPane, node, node.data.value, onValueChange);
					break;
				case 'dictionaryitem':
					dictionaryItemView.init(elDetailsPane, node, node.data.value, onValueChange);
					break;
				case 'number':
				//	numberView.init(elDetailsPane, node, node.data.value, onValueChange);
				//	break;
				case 'integer':
					numberView.init(elDetailsPane, node, node.data.value, onValueChange);
					//integerView.init(elDetailsPane, node, node.data.value, onValueChange);
					break;
				case 'bytearray':
					byteArrayView.init(elDetailsPane, node, node.data.value, onValueChange);
					break;
				case 'boolean':
					booleanView.init(elDetailsPane, node, node.data.value, onValueChange);
					break;
				case 'xml':
					xmlView.init(elDetailsPane, node, node.data.value, onValueChange);
					break;
				case 'string':
					stringView.init(elDetailsPane, node, node.data.value, onValueChange);
					break;
				case 'vector':
					vectorView.init(elDetailsPane, node, node.data.value, onValueChange);
					break;
				case 'date':
					dateView.init(elDetailsPane, node, node.data.value, onValueChange);
					break;
			}
		}
	}
	
	////////////////
	// Details //
	////////////////
	function resetDetails() {
		dateView.reset();
		xmlView.reset();
		byteArrayView.reset();
		booleanView.reset();
		numberView.reset();
		integerView.reset();
		stringView.reset();
		arrayView.reset();
		objectView.reset();
		vectorView.reset();
		dictionaryView.reset();
		dictionaryItemView.reset();
		
		elDetailsPane.removeClass();
		elDetailsPane.addClass('details');
		elDetailsPane.html('');
	}
});