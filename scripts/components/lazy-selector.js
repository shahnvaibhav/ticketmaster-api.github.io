/**
 * required to include: lazy-selector-modal.html
 *
 * availiable option : {enum:'attractions' , 'venues', ''}
 * $('.js_lazy-selector').lazySelector();
 * $('.js_lazy-selector-attractions').lazySelector('attractions');
 * $('.js_lazy-selector-venues').lazySelector('venues');
 */

(function ($) {

  $.fn.lazySelector = function (options) {
    var defaults = {},
        settings = $.extend({}, $.fn.lazySelector.defaults, options),
        $iconButton = $('<a class="icon" id="get-event-by-Id-' + options + '" data-toggle="modal" data-target="#js_ls-modal" />');

    var stateConf = {
      pageIncrement: 0,
      loadingFlag: false
    };

    var $modal = $('#js_ls-modal'),
      $form = $('#js_lazy-sel_form', $modal),
      $ul = $('#js_lazy-sel_list'),
      $liFooter = $('#load-more-box'),
      $hr = $('#js_ls-top-hr'),
      $btnGET = $modal.find('#js_ls-modal_btn'),
      btnCloseMap = $('.button-close-map', $modal),
      cssValidationClass = 'get-eventId_form-validation',
      modalContent = $('.modal-content', $modal);

    var keyword = $form.find('#keyword'),
      defaultApiKey = apiKeyService.getApiExploreKey(),
      apikey = checkCookie() || $('#w-tm-api-key').val() || defaultApiKey,
      selector = options || 'events',
      eventUrl = 'https://app.ticketmaster.com/discovery/v2/' + selector + '.json';

    var $input = $(this);

    function formatDate(date) {
      var result = '';
      if (!date.day) return result; // Day is required

      var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        dayArray = date.day.split('-'),
        d = parseInt(dayArray[2]),
        M = parseInt(dayArray[1]);

      var E = new Date(date.day).getDay();

      //var E1 = new Date(+date.day.split('-')[0],(+date.day.split('-')[1])-1,+date.day.split('-')[2]).getDay();
      //if(E !== E1) console.log('\t alarm equal - ' , E === E1);

      result = DAY_NAMES[E] + ', ' + MONTH_NAMES[M - 1] + ' ' + d + ', ' + dayArray[0];

      if (!date.time) return result;

      var timeArray = date.time.split(':'),
        H = parseInt(timeArray[0]),
        m = timeArray[1],
        a = "AM";

      if (H > 11) a = "PM";
      if (H == 0) {
        H = 12;
      } else if (H > 12) {
        H = H - 12;
      }

      return result + ' ' + getNormalizedDateValue(H) + ':' + m + ' ' + a;
    }

    function getNormalizedDateValue(val) {
      return (val < 0 || val > 9 ? "" : "0") + val
    }

    /**
     * Show or init map listener
     * @param e
     */
    var mapPopUpListener = function (e) {
      e.preventDefault();
      var lat = $(e.target).attr('data-latitude') != "undefined" ? parseFloat($(e.target).attr('data-latitude')) : null,
        lng = $(e.target).attr('data-longitude') != "undefined" ? parseFloat($(e.target).attr('data-longitude')) : null,
        address = lat && lng ? null : $(e.target).attr('data-address');

      // console.log("lat");
      if (lat && lng ) {
        initMap(lat, lng);
        google.maps.event.trigger(map, "resize");
        // console.log('second init');
      } else {
        initMap(0, 0);
        // console.log("first init");
      }
    };


    /**
     * Init map google maps
     * @param lat - float
     * @param lng - float
     * @param address - not used @deprecated
     */
    var map = null;
    var markers = [];
    var initMap = function (lat, lng) {
    var mapEl = $('#js_ls-modal'),
        mapCenter = new google.maps.LatLng(lat || 55, lng || 43);
      // geocoder = new google.maps.Geocoder(),
      // latLng = (lat && lng ? {lat: lat, lng: lng} : new google.maps.LatLng(0, 0));

      if(map === null){
        // initialize map object
        map = new google.maps.Map(document.getElementById('map-canvas'), {
          center: mapCenter,
          zoom: 10,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false
        });
      }else {
        clearMarkers();

        //set new center
        map.panTo(mapCenter); //smooth center. If the change is less than both the width and height of the map, the transition will be smoothly animated.
        map.setCenter(mapCenter);
      }

      // Adds a marker at the center of the map.
      addMarker(mapCenter);


      /*if (address){ // if there was address provided
       geocodeAddress(geocoder, map, address, function(result){ // geocode address and center the map
       latLng = result;
       });
       } else { // if not (means lat and long were provided)*/
      //}

      // when map popup is shown
      mapEl.on("shown.bs.modal", function () {
        // Recenter the map now that it's been redrawn
        google.maps.event.trigger(map, "resize");
        map.setCenter(mapCenter);
      });
      mapEl.modal(); // show map popup
    };

    // Adds a marker to the map and push to the array.
    function addMarker(mapCenter) {
      var marker = new google.maps.Marker({ //Create a marker and set its position.
        map: map,
        position: mapCenter,
        icon: new google.maps.MarkerImage('../../../../assets/controls/pin-ic.svg',
          null, null, null, new google.maps.Size(34, 52))
      });
      markers.push(marker);
    }

    // Removes the markers from the map, but keeps them in the array.
    function clearMarkers() {
      for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
      }
      markers = [];
    }

    function closeMapListener() {
      modalContent.removeClass('narrow');
      btnCloseMap.hide(); // 'X' -button
    }

    /**
     * change <Load_More> button text
     * set data-selector gor "GET" button
     */
    function changeModalTextListener() {
      if (selector !== 'events') {
        $('.modal-title span', $modal).text(selector);
        $('#js_ls-more_btn', $modal).text('SHOW MORE ' + selector);
      }
      if(selector === 'venues'){
        $('.wrapper-list-group', $modal).addClass('low-height');
      }else {
        $('.wrapper-list-group', $modal).removeClass('low-height');
      }
      $btnGET.attr('data-selector', selector);
    }

    /**
     * show/hide loader
     * @param action - string ('on' or 'off')
     */
    var loading = function (action) {
      var spinner = $('#spinner-ls', $modal);
      // add the overlay with loading image to the page
      if (action == "on") {
        spinner.show();
      }
      else if (action == "off") {
        spinner.hide();
      }

    };

    function resetForm() {
      stateConf.pageIncrement = 0;
      var listItems = $ul.find('li');
      listItems.remove();
      $hr.hide();
      $liFooter.hide();
      /*$form.find('input').each(function(){
         var $self = $(this);
         if($self.attr('id','keyword')){
         $self.val('');
          }
       });*/

      // Clear highlight
      $form.removeClass(cssValidationClass);
    }

    /**
     * Handler for 'GET' button
     * @param pageNumero - int. used for pagination
     * @param eventUrl - url of request
     * @returns {boolean} - done/fail
     */
    function submitForm(/*optional*/pageNumero) {
      pageNumero = parseInt(pageNumero);

      var url = ( isNaN(pageNumero) )
        ? eventUrl + '?apikey=' + apikey + '&keyword=' + keyword.val()
        : eventUrl + '?apikey=' + apikey + '&keyword=' + keyword.val() + '&page=' + pageNumero;

       // console.log('url : ', url);

      //stop load
      if (isNaN(pageNumero) && pageNumero !== 0 && stateConf.loadingFlag === 'STOP_LOAD') {
        renderResults(null, $ul);
        // console.log('stateConf.loadingFlag - top', stateConf.loadingFlag);
        return false
      };

      if (stateConf.loadingFlag === 'FINAL_PAGE') return false;

      // console.log('ajax - start');
      $.ajax({
        dataType: 'json',
        async: true,
        url: url,
        data: $form.serialize()
      }).done(function (result) {
        if (result) {

          //last page reached
          if (stateConf.pageIncrement === result.page.totalPages && result.page.totalElements > 0) {
            stateConf.loadingFlag = 'STOP_LOAD';
            loading('off');
            renderResults(result, $ul); //add message at bottom of list
            return false;
          };

          renderResults(result, $ul);
          loading('off');
        } else {
          console.log('no result found');
        }
      }).fail(function (e) {
        console.log('There was an fail status - ' , e.status);
        loading('off');
        renderResults('FAIL', $ul);
      });

    }

    /**
     * find image that have width more then 120px
     * @param images - array
     * @returns {image with lowest+1 width }
     */
    function getImageForEvent(images) {
      images.sort(function (a, b) {
        if (a.width < b.width)
          return -1;
        else if (a.width > b.width)
          return 1;
        else
          return 0;
      });
      return images[1].url;
    }

    /**
     * render for events-id-selector
     * @param items - array
     */
    function renderListEvents(items) {
      var src;
      items.map(function (item) {
        var li = $('<li/>')
          .addClass('list-group-item row')
          //.insertBefore($liFooter);
          .appendTo($ul);

        var leftCol = $('<div class="clear-padding" />').appendTo(li);
        var spanImg = $('<span class="thumbnail" />')
          .appendTo(leftCol);

        if (item.images) {
          src = "src=" + getImageForEvent(item.images);
        } else {
          src = 'style="background-color: #f7f9fa;width: 120px; border: none;"';
        }

        var img = $('<img ' + src + ' />')
          .addClass('list-group-item-heading')
          .appendTo(spanImg);

        var $wrapCol = $('<div class="event-text-wrapper"/>')
          .appendTo(li);
        if (item.name) {
          var title = $('<h4/>')
            .addClass('list-group-item-heading')
            .text(item.name)
            .appendTo($wrapCol);
        }

        /*add time*/
        var currentEvent = {};
        currentEvent.date = {
          day: item.dates.start.localDate,
          time: item.dates.start.localTime,
          dateTime: item.dates.start.dateTime
        };

        var time = formatDate(currentEvent.date);
        var eventTime = $('<h4 class="event-time gray"/>')
        //.addClass('event-time')
          .text(time)
          .appendTo($wrapCol);
        /*add time end*/

        if (item._embedded) {

          if (item._embedded.venues) {
            var venue = item._embedded.venues[0];
            var addressName = $('<span/>')
              .addClass('address-name')
              .text(venue.name + '. ')
              .appendTo($wrapCol);

            if ('address' in venue && 'line1' in venue.address) {
              var addressline1 = $('<span/>')
                .addClass('address-line1')
                .text(venue.address.line1)
                .appendTo($wrapCol);
              if ('line2' in venue.address) {
                var addressline1 = $('<span/>')
                  .addClass('address-line2')
                  .text(venue.address.line2)
                  .appendTo(addressline1);
              }
            }
            /*if ('location' in venue) {
             //add button <Show on map> if 'location' exist
             var buttonMap = $("<button style='display: none;' data-latitude=" + venue.location.latitude + " data-longitude=" + venue.location.longitude + "/>")
             .addClass('js_open-map_btn btn btn-submit')
             .text('Show location')
             .appendTo(buttonSetId)
             .wrap('<div class ="wrapper-location_btn"/>');
             }*/
          } else {
            console.log('no _embedded found');
          }
        }

        if (item.id) {
          //add button <Set this ID> if 'location' exist
          var buttonSetId = $("<button data-event=" + item.id + "/>")
            .addClass('js_lazy-sel_btn btn btn-submit')
            .text('Use this ID')
            .appendTo(li)
            .wrap('<div class ="wrapper-btns text-right"/>');
        }

      });
    }

    /**
     * render for venues-id-selector
     * @param items - array
     */
    function renderListVenues(items) {
      items.map(function (item) {

        var li = $('<li/>')
          .addClass('list-group-item row')
          .appendTo($ul);

        if (item.images) {
          var leftCol = $('<div class="clear-padding" />').appendTo(li);
          var spanImg = $('<span class="thumbnail" />')
            .appendTo(leftCol);
          var img = $('<img src=' + getImageForEvent(item.images) + ' />')
            .addClass('list-group-item-heading')
            .appendTo(spanImg);
        }

        var $wrapCol = $('<div class="event-text-wrapper clear-margin-left"/>')
          .appendTo(li);

        if (item.name) {
          var title = $('<h3/>')
            .addClass('list-group-item-heading')
            .text(item.name)
            .appendTo($wrapCol);
        }

        if (item.dates) {
          // console.log('item.dates' , item.dates);
          /*add time*/
          var currentEvent = {};
          currentEvent.date = {
            day: item.dates.start.localDate,
            time: item.dates.start.localTime,
            dateTime: item.dates.start.dateTime
          };

          var time = formatDate(currentEvent.date);
          var eventTime = $('<h4 class="event-time gray"/>')
          //.addClass('event-time')
            .text(time)
            .appendTo($wrapCol);
          /*add time end*/
        }

        if (item) {
          var venue = item; // item._embedded.venues[0];
          var contryStateName = $('<h4/>')
            .addClass('country-name gray')
            .text((venue.country && venue.country.name) ? venue.country.name : '')
            .append((venue.state && venue.state.name) ? $('<span class="add-dot">' +venue.state.name+ '</>'): '')
            .appendTo($wrapCol);
          var cityName = $('<span/>')
            .addClass('address-name')
            .text((venue.city && venue.city.name) ? venue.city.name + '. ' : '')
            .appendTo($wrapCol);

          if ('address' in venue && 'line1' in venue.address) {
            var addressline1 = $('<span/>')
              .addClass('address-line1')
              .text(venue.address.line1 + '.')
              .appendTo($wrapCol);
            if ('line2' in venue.address) {
              var addressline1 = $('<span/>')
                .addClass('address-line2')
                .text(venue.address.line2)
                .appendTo(addressline1);
            }
          }

        } else {
          console.log('no _embedded found');
        }

        if (item.id) {
          var buttonSetId = $("<button data-event=" + item.id + "/>")
            .addClass('js_lazy-sel_btn btn btn-submit')
            .text('Use this ID')
            .appendTo(li)
            .wrap('<div class ="wrapper-btns text-right"/>');
          if ('location' in venue && venue.location.latitude && venue.location.longitude) {
            //console.log('venue.location - ' , venue.location);
            var buttonMap = $("<button style='float: right;' data-latitude=" + venue.location.latitude + " data-longitude=" + venue.location.longitude + "/>")
              .addClass('js_open-map_btn btn btn-transparent')
              .text('Show on map')
              .insertAfter(buttonSetId)
              //.appendTo(buttonSetId)
              .wrap('<div class ="wrapper-location_btn"/>');
          }
        }

      });
    }

    /**
     * render for attractions-id-selector
     * @param items - array
     */
    function renderListAttractions(items) {
      items.map(function (item) {

        var li = $('<li/>')
          .addClass('list-group-item row')
          .appendTo($ul);

        if (item.images) {
          var leftCol = $('<div class="clear-padding" />').appendTo(li);
          var spanImg = $('<span class="thumbnail" />')
            .appendTo(leftCol);
          var img = $('<img src=' + getImageForEvent(item.images) + ' />')
            .addClass('list-group-item-heading')
            .appendTo(spanImg);
        }

        var $wrapCol = $('<div class="event-text-wrapper clear-margin-left"/>')
          .appendTo(li);

        if (item.name) {
          var title = $('<h3/>')
            .addClass('list-group-item-heading')
            .text(item.name)
            .appendTo($wrapCol);
        }

        if (item.dates) {
          // console.log('item.dates' , item.dates);
          /*add time*/
          var currentEvent = {};
          currentEvent.date = {
            day: item.dates.start.localDate,
            time: item.dates.start.localTime,
            dateTime: item.dates.start.dateTime
          };

          var time = formatDate(currentEvent.date);
          var eventTime = $('<h4 class="event-time gray"/>')
          //.addClass('event-time')
            .text(time)
            .appendTo($wrapCol);
          /*add time end*/
        }

        if(item.classifications){
          if(item.classifications.length > 1) console.log(item.classifications.length);

          var _genre, _subgenre,_segment;
          if(item.classifications[0]){
            _segment = item.classifications[0].segment;
            _genre = item.classifications[0].genre;
            _subgenre = item.classifications[0].subGenre;

            var segmentText = $('<h4/>')
              .addClass('country-name gray')
              .text(( _segment && _segment.name && _segment.name !== 'Undefined') ? _segment.name : '')
              .appendTo($wrapCol);

            var genre = $('<span/>')
              .addClass('classifications-name')
              .append(( _genre && _genre.name && _genre.name !== 'Undefined') ? $('<span >' +_genre.name+ '</>'): '')
              .append(( _subgenre && _subgenre.name && _subgenre.name !== 'Undefined') ? $('<span class="add-dot">' +_subgenre.name+ '</>'): '')
              .appendTo($wrapCol);
          }
        }
        if (item) {
          var venue = item; // item._embedded.venues[0];
          var contryStateName = $('<h4/>')
            .addClass('country-name gray')
            .text((venue.country && venue.country.name) ? venue.country.name + '. ' : '')
            .append((venue.state && venue.state.name) ? venue.state.name + '. ' : '')
            .appendTo($wrapCol);
          var cityName = $('<span/>')
            .addClass('address-name')
            .text((venue.city && venue.city.name) ? venue.city.name + '. ' : '')
            .appendTo($wrapCol);

          if ('address' in venue && 'line1' in venue.address) {
            var addressline1 = $('<span/>')
              .addClass('address-line1')
              .text(venue.address.line1 + '.')
              .appendTo($wrapCol);
            if ('line2' in venue.address) {
              var addressline1 = $('<span/>')
                .addClass('address-line2')
                .text(venue.address.line2)
                .appendTo(addressline1);
            }
          }

        } else {
          console.log('no _embedded found');
        }

        if (item.id) {
          var buttonSetId = $("<button data-event=" + item.id + "/>")
            .addClass('js_lazy-sel_btn btn btn-submit')
            .text('Use this ID')
            .appendTo(li)
            .wrap('<div class ="wrapper-btns text-right"/>');
          if ('location' in venue && venue.location.latitude && venue.location.longitude) {
            //console.log('venue.location - ' , venue.location);
            var buttonMap = $("<button style='float: right;' data-latitude=" + venue.location.latitude + " data-longitude=" + venue.location.longitude + "/>")
              .addClass('js_open-map_btn btn btn-transparent')
              .text('Show on map')
              .insertAfter(buttonSetId)
              //.appendTo(buttonSetId)
              .wrap('<div class ="wrapper-location_btn"/>');
          }
        }

      });
    }

    function hasScrollBar(element, wrapper) {
      return element.get(0).scrollHeight > element.parent().innerHeight();
    }

    var renderResults = function (data, ulElement) {
      var items;
      /*items= (selector === 'events')
       ? (data && data._embedded && data._embedded.events) ? data._embedded.events:['']
       : (data && data._embedded && data._embedded.venues) ? data._embedded.venues:[''] ;*/
      // console.log('selector * renderResults', selector , 'items' , items);

      function showMessage(element, message, /*optional*/clearList) {
        $btnGET.attr('disabled', false);

        if (clearList) $('li', element).remove();
        element.css({
          'overflow': 'auto'
        });
        $('<li/>')
          .addClass('list-group-item text-center')
          .text(message)
          .appendTo(ulElement);
      }


      if (stateConf.loadingFlag === "FINAL_PAGE") return false; //exit if has reached last page

      //show fail msg
      if (data === 'FAIL') {
        showMessage($ul, 'Failure, possible key not correct.', true);
        modalContent.removeClass('narrow');
        return false;
      }

      if (stateConf.loadingFlag === 'STOP_LOAD' && data.length !== 0) {
        stateConf.loadingFlag = "FINAL_PAGE";
        showMessage(ulElement, 'No more results.', false);
        $liFooter.hide();
        return false;
      }

      if (data === null || !data._embedded) {
        showMessage(ulElement, 'No results found.', true);
        modalContent.removeClass('narrow');
        return false;
      }

      //start render data
      if (selector === 'events') {
        items = (data && data._embedded && data._embedded.events) ? data._embedded.events : [''];
        renderListEvents(items)
      } else if (selector === 'venues') {
        items = (data && data._embedded && data._embedded.venues) ? data._embedded.venues : [''];
        renderListVenues(items);
      } else if (selector === 'attractions') {
        items = (data && data._embedded && data._embedded.attractions) ? data._embedded.attractions : [''];
        renderListAttractions(items);
      }

      //hide scroll if recive less then 2 items
      // if (data && data.page && data.page.totalElements <= 3) {
      //   $ul.css({"overflowY": "hidden" , "width": "100%"});
      // } else $ul.css({"overflowY": "scroll" , "width": "100%"});
      if (hasScrollBar($ul)) {
        $ul.removeClass('no-scroll');
      } else {
        $ul.addClass('no-scroll');
      }

      // hide/show horisontal line and button <load more>
      if (data && data.page && data.page.totalElements > 20) {
        $hr.show();
        $liFooter.show();
      } else {
        $hr.hide();
        $liFooter.hide();
      }

      // hide button <load more> if nothing left to load
      if (stateConf.loadingFlag === 'STOP_LOAD' || (stateConf.pageIncrement + 1) === data.page.totalPages) {
        //console.log('.modal-footer  ---- hide', stateConf.loadingFlag);
        $hr.hide();
        $liFooter.hide();
      }
      if (data.page.totalElements > 0 || items.length > 0) {
        $hr.show();
      }

      //<show map> button
      $('.js_open-map_btn').on('click', function (e) {
        // var mapCanvas = $("#map-canvas");
        var ltd = e.target.getAttribute('data-latitude'),
          lgt = e.target.getAttribute('data-longitude');
        mapPopUpListener(e);
        modalContent.addClass('narrow');
        btnCloseMap.show();
      });

      $('.js_lazy-sel_btn').on('click', function (e) {
        var selectedID = e.target.getAttribute('data-event');
        $input.val(selectedID);
        $input.attr('value', selectedID);
        $input.trigger('change');  //update widget:

        // Close dialog
        $modal.modal('hide');
      });

      //set availible <Get> button after load is finished
      $btnGET.attr('disabled', false);

    };

    /**/

    function checkCookie() {
      var userApiKey,
          apiKeys = JSON.parse("[" + window.atob(getCookie("tk-api-key")) + "]"); //decode and convert string to array

      /*todo: delete me*/
      function setCookie(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays*24*60*60*1000));
        var expires = "expires="+d.toUTCString();
        document.cookie = cname + "=" + cvalue + "; " + expires;
      }
      if (apiKeys != "") {
        userApiKey = apiKeys[0][apiKeys[0].length-1]; //convert to array
      }else {
        /*todo: delete me*/
        // apiKeys = JSON.parse("[" + window.atob( 'WyJWNHRQcGxaM1lKYXFwQUwzNFpJZ3ZYZ2Nxand1ZWttTiIsIjkyWVprT0poeWhvVmJNWkM1NDFsNHUwaDNNQnJ5U2lTIl0' ) + "]"); //decode and convert string to array
        // userApiKey = apiKeys[0][apiKeys[0].length-1]; //convert to array
        // setCookie("tk-api-key", 'WyJWNHRQcGxaM1lKYXFwQUwzNFpJZ3ZYZ2Nxand1ZWttTiIsIjkyWVprT0poeWhvVmJNWkM1NDFsNHUwaDNNQnJ5U2lTIl0', 2);
      }
      return userApiKey;
    }

    //get Cookie by name
    function getCookie(cname) {
      var name = cname + "=";
      var ca = document.cookie.split(';');
      for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') {
          c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
          return c.substring(name.length,c.length);
        }
      }
      return "";
    }

    // EVENTS
    $btnGET.on('click', function (e) {
      e.preventDefault();
      if ($btnGET.attr('data-selector') !== $iconButton.attr('data-selector')) return false; //stop request

      /*if (selector === 'venues') {
         mapPopUpListener(e);
      }*/
      modalContent.removeClass('narrow');
      var form = $form.get(0);
      if (!$btnGET.is(':disabled')) {
        if (form.checkValidity()) {
          $btnGET.attr('disabled', true);
          stateConf.pageIncrement = 0;
          stateConf.loadingFlag = 'KEEP_LOAD';
          loading('on'); //show loading-spinner
          resetForm(); //clear
          submitForm(stateConf.pageIncrement, eventUrl);
        } else {
          // Highlight errors
          if (form.reportValidity) form.reportValidity();
          $form.addClass(cssValidationClass);
        }
      }
    });

    //Close Map button
    btnCloseMap.on('click', closeMapListener);

    $('#js_ls-more_btn', $liFooter).on('click', function (elm) {
      if ($btnGET.attr('data-selector') !== $iconButton.attr('data-selector')) return false;
      // eventUrl = 'https://app.ticketmaster.com/discovery/v2/' + $iconButton.attr('data-selector') + '.json';

      stateConf.pageIncrement++;
      $btnGET.attr('disabled', true);
      loading('on');
      submitForm(stateConf.pageIncrement, eventUrl);
    });

    /*on scroll bottom of list*/
    /*
     $ul.on('scroll', function (elm){
     //submitForm when go to bottom of list
       if($form.get(0).checkValidity()) {
         if (this.scrollTop + this.clientHeight == this.scrollHeight && stateConf.loadingFlag === 'KEEP_LOAD') {
         stateConf.pageIncrement++;
         $btnGET.attr('disabled', true);
         loading('on');
         submitForm(stateConf.pageIncrement);
         }
       }
     });*/

    $form.on("keyup", function (e) {
      var input = $(e.target);
      if (e.target.tagName === "INPUT"){
        if (e.keyCode == 13){
          input.blur();

          modalContent.removeClass('narrow');
          if ($btnGET.attr('data-selector') !== $iconButton.attr('data-selector')) return false;

          if ($form.get(0).checkValidity()) {
            stateConf.pageIncrement = 0;
            stateConf.loadingFlag = 'KEEP_LOAD';
            loading('on');
            resetForm();
            submitForm(stateConf.pageIncrement, eventUrl);
          }
        }
      }
      return false;
    });

    // Mobile devices. Force 'change' by 'Go' press

    $form.on("submit", function (e) {
      e.preventDefault();
    });

    $modal.on('hidden.bs.modal', function (e) {
      resetForm();
      keyword.val('');//clear search input
      closeMapListener();
    });

    return this.each(function (i) {
      var $input = $(this);

      init($input);  //console.log('$input', $input);

      function init(input) {
        if (selector !== 'events') {
          $('.modal-title span', $modal).text(selector);
          $('#js_ls-more_btn', $modal).text('SHOW MORE ' + selector);
        }
        input.wrap('<div class="lazy-selector-wrapper"></div>');
        input.after($iconButton);
        $iconButton.attr('data-selector', selector);

        $('#get-event-by-Id-' + options + '').on('click', changeModalTextListener);

      }
    });

  };

})(jQuery);

/**
 * add lazy selector to Contdown widget
 */
$(document).on('ready', function () {
  $('.js_lazy-selector').lazySelector();
  $('.js_lazy-selector-attractions').lazySelector('attractions');
  $('.js_lazy-selector-venues').lazySelector('venues');
});


/**
 * add lazy selector to api-explorer v1 (made by V.Menshutin)
 */
$(document).on( "finishInit", function( event, flag ) {
  $('#venueId').lazySelector('venues');
  $('#attractionId').lazySelector('attractions');
});