var Alert = (function() {
	var o = {};
	o.OK = 0x0004;
	o.CANCEL = 0x0008;
	o.YES = 0x0001;
	o.NO = 0x0002;
	o.ERROR = 'Error';
	o.INFO = 'Information';
	o.NOTICE = 'Notice';
	o.WARNING = 'Warning';

	var elOverlay = $('#alertOverlay'),
		elTitle = $('#alertWindow h1'),
		elMessage = $('#alertWindow p'),
		btnOk = $('#btnAlertOk'),
		btnCancel = $('#btnAlertCancel'),
		btnYes = $('#btnAlertYes'),
		btnNo = $('#btnAlertNo'),
		closeHandlerFunc;
		
	btnOk.on('click', function(event) {
		closeAlert();
		if (closeHandlerFunc) closeHandlerFunc(o.OK);
	});
	
	btnCancel.on('click', function(event) {
		closeAlert();
		if (closeHandlerFunc) closeHandlerFunc(o.CANCEL);
	});
	
	btnYes.on('click', function(event) {
		closeAlert();
		if (closeHandlerFunc) closeHandlerFunc(o.YES);
	});
	
	btnNo.on('click', function(event) {
		closeAlert();
		if (closeHandlerFunc) closeHandlerFunc(o.NO);
	});
	
	$('#alertOverlay .close-top').on('click', function(event) {
		closeAlert();
	});
	
	function show(text, title, flags, closeHandler) {
		if (!title) title = 'Alert';
		if (!flags) flags = 0x0004;
		closeHandlerFunc = closeHandler;
		
		// Set content
		elTitle.html(title);
		elMessage.html(text);
		
		// Show hide buttons
		if (flags & o.OK) {
			btnOk.addClass('show');
		}
		if (flags & o.CANCEL) {
			btnCancel.addClass('show');
		}
		if (flags & o.YES) {
			btnYes.addClass('show');
		}
		if (flags & o.NO) {
			btnNo.addClass('show');
		}

		// Show alert
		elOverlay.addClass('show');
	};
	
	function closeAlert() {
		elTitle.html('');
		elMessage.html('');
		elOverlay.removeClass('show');
		btnOk.removeClass('show');
		btnCancel.removeClass('show');
		btnYes.removeClass('show');
		btnNo.removeClass('show');
	};
	
	////////////
	// Public //
	////////////
	o.show = show;
	return o;
})();