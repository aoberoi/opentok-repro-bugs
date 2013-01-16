var sessionId = '1_MX44NTQ1MTF-MTI3LjAuMC4xflR1ZSBKYW4gMTUgMTQ6Mjk6NTMgUFNUIDIwMTN-MC4yMjEzOTU2MX4';
var apiKey = '854511';
var token = 'T1==cGFydG5lcl9pZD04NTQ1MTEmc2lnPWM2ZjQxMmI1ZDBmYTRjNzQyMDE4YzY5MjQzZWRmODc5ZTI3YTUwZjY6c2Vzc2lvbl9pZD0xX01YNDROVFExTVRGLU1USTNMakF1TUM0eGZsUjFaU0JLWVc0Z01UVWdNVFE2TWprNk5UTWdVRk5VSURJd01UTi1NQzR5TWpFek9UVTJNWDQmY3JlYXRlX3RpbWU9MTM1ODI4OTAwNCZleHBpcmVfdGltZT0xMzYwODgxMDA0JnJvbGU9cHVibGlzaGVyJm5vbmNlPTUwNDU5MyZzZGtfdmVyc2lvbj10Yi1kYXNoYm9hcmQtamF2YXNjcmlwdC12MQ==';
var session;

// Get camera names
var cameraNames = [];
function devicesDetectedHandler(event) {
  for (var i = 0; i < event.cameras.length; ++i) {
    cameraNames.push(event.cameras[i].name);
  }
  cameraNamesRetrieved();
}
var deviceManager = TB.initDeviceManager(apiKey);
deviceManager.addEventListener('devicesDetected', devicesDetectedHandler);


// Attach button handlers
function cameraNamesRetrieved() {
  if (cameraNames.length < 2) {
    $('button.run').attr('disabled', 'disabled').text('More than 1 camera needed to test');
  } else {
    initializeSession();
    $('.attached.run').on('click', function attachedHandler(event) {
      session.addEventListener('sessionConnected', createAttachedPublishers);
      session.connect(apiKey, token);
      disableInteractions(this, 'attached', attachedHandler);
    });
    $('.detached.run').on('click', function detachedHandler(event) {
      var parentElement = $('.detached .pub-container')[0];
      var publishers = [];
      var pub, id;
      var eventAggregator = new EventAggregator('accessAllowed', allAllowedHandler);

      disableInteractions(this, 'detached', detachedHandler);

      for (var i = 0; i < cameraNames.length; ++i) {
        id = createPublisherElement(parentElement, cameraNames[i]);
        pub = TB.initPublisher(apiKey, id, { cameraName : cameraNames[i] });
        publishers.push(pub);
        eventAggregator.observeObject(pub);
      }

      session.addEventListener('sessionConnected', function() {
        attachPublishers(publishers);
      });

      eventAggregator.begin();

      function allAllowedHandler() {
        session.connect(apiKey, token);
      }
    });
  }
}

// Continuations / Helpers
function createAttachedPublishers(event) {
  var parentElement = $('.attached .pub-container')[0];
  var id;
  for (var i = 0; i < cameraNames.length; ++i) {
    id = createPublisherElement(parentElement, cameraNames[i]);
    session.publish(id, { cameraName : cameraNames[i] });
  }
}

function attachPublishers(publishers) {
  for (var i = 0; i < publishers.length; ++i) {
    session.publish(publishers[i]);
  }
  console.log('detached publishers attached to session');
}

function initializeSession() {
  session = TB.initSession(sessionId);
}

function createPublisherElement(parentElement, cameraName) {
  var el = $('<div/>');
  var id = 'publisher-' + cameraName;
  el.attr('id', id);
  parentElement.appendChild(el[0]);
  return id;
}

function disableInteractions(buttonEl, runningTest, connectHandler) {
  var $buttonEl = $(buttonEl);

  // add a disconnect button (and handler)
  $buttonEl.off('click', connectHandler);
  $buttonEl.text('Disconnect').on('click', doDisconnectHandler);

  // disable the other button
  var $otherButton;
  if (runningTest === 'attached') {
    $otherButton = $('.detached.run');
  } else if (runningTest === 'detached') {
    $otherButton = $('.attached.run');
  }
  $otherButton.attr('disabled', 'disabled');

  // handle disconnect to enable interactions
  session.addEventListener('sessionDisconnected', function (event) {
    $buttonEl.off('click', doDisconnectHandler);
    $buttonEl.text('Run Test').on('click', connectHandler);
    $otherButton.removeAttr('disabled');
  });
}

function doDisconnectHandler() {
  session.disconnect();
  // TODO: use case for a session.removeEventListeners(event) function
  // remove all sessionConnected event handlers
  session._listeners.sessionConnected.forEach(function(handler) {
    session.removeEventListener('sessionConnected', handler);
  });
}


// DOM Loaded
$(function() {
  // TODO: promises use case: get a promise for cameraNames retrieved and put a .then
  // clause into the dom loaded handler
  deviceManager.detectDevices();
});

// Event Aggregator
function EventAggregator(event, cb) {
  this.event = event;
  this.cb = cb;
  this.observedObjects = [];
  this.hasBegun = false;
}

EventAggregator.prototype.observeObject = function (obj) {
  var self = this;
  self.observedObjects.push(obj);
  obj.addEventListener(self.event, function(event) {
    var idx;
    if (self.hasBegun && (idx = self.observedObjects.indexOf(obj)) !== -1 ) {
      self.observedObjects.splice(idx, 1);
      if (self.observedObjects.length === 0) {
        self.cb();
      }
    }
  });
};

EventAggregator.prototype.begin = function() {
  this.hasBegun = true;
};
