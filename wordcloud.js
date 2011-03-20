
"use strict";

function t(id) {
	var s = T[id];
	if (!s) return id;
	if (!s.replace) return s;
	for (var i = 1; i < arguments.length; i++) {
		s = s.replace(new RegExp('\\\$' + i.toString(10), 'g'), arguments[i]);
	}
	return s;
}

jQuery(function ($) {
	var $c = $('#canvas'),
		$toggleUI = $('.toggleUI'),
		$loading = $('#loading'),
		$error = $('#error'),
		$loadingText = $('#loading > p'),
		$errorText = $('#error > p'),
		wordfreq = WordFreq({root: '../'}),
		theme = [
			{
				fontFamily: '"Myriad Pro", "Lucida Grande", Helvetica, "Heiti TC", "微軟正黑體", "Arial Unicode MS", "Droid Fallback Sans", sans-serif',
				wordColor: 'rgba(255,255,255,0.8)',
				backgroundColor: '#353130'
			},
			{
				fontFamily: '"Trebuchet MS", "Heiti TC", "微軟正黑體", "Arial Unicode MS", "Droid Fallback Sans", sans-serif',
				wordColor: 'rgba(0,0,0,0.7)',
				backgroundColor: 'rgba(255, 255, 255, 1)'  //opaque white
			},
			{
				// http://ethantw.net/projects/lab/css-reset/
				fontFamily: 'Baskerville, "Times New Roman", "華康儷金黑 Std", "華康儷宋 Std",  DFLiKingHeiStd-W8, DFLiSongStd-W5, "Hiragino Mincho Pro", "LiSong Pro Light", "標楷體", serif',
				wordColor: '#fff',
				backgroundColor: '#000'
			}
		],
		list, weightFactor, gridSize, themeid = 0;

	function resetCanvasSize() {
		var width = document.body.offsetWidth,
		height = document.body.offsetHeight;
		
		$c.attr(
			{
				height: height,
				width: width
			}
		).css({
			width: width.toString(10) + 'px',
			height: height.toString(10) + 'px',
			top: '50%',
			left: '50%',
			marginLeft: '-' + (width/2).toString(10) + 'px',
			marginTop: '-' + (height/2).toString(10) + 'px'
		});
	}

	if (
		!$.wordCloudSupported
		|| !WordFreq.supported
		|| !Array.prototype.forEach
		|| !Array.prototype.pop
		|| !Array.prototype.push
		|| !('onhashchange' in window)
	) {
		$('#not_support').show();
		return;
	}

	var changeUIState = {
		start: function () {
			$toggleUI.hide();
			$loading.fadeOut(100);
			$('#start').show();
			resetCanvasSize();
			$c.show().wordCloud({
				wordColor: theme[themeid].wordColor,
				backgroundColor: theme[themeid].backgroundColor,
				fontFamily: theme[themeid].fontFamily,
				wait: 50,
				wordList: [
					[t('startList_1'), t('startList_1C')],
					[t('startList_2'), t('startList_2C')],
					[t('startList_3'), t('startList_3C')],
					[t('startList_4'), t('startList_4C')]
				],
				abortThreshold: 200,
				abort: changeUIState.too_slow
			});
			return false;
		},
		source: function () {
			$toggleUI.hide();
			$loading.fadeOut(100);
			resetCanvasSize();
			changeSource.apply($('input[name=source]:checked')[0]);
			$('#source_panel').show();
			return false;
		},
		ready: function () {
			$toggleUI.hide();
			$loading.fadeOut(100);
			resetCanvasSize();
			$('#title').show();
			$c.show();
			$('#ready').show();
			return false;
		},
		draw: function () {
			$toggleUI.hide();
			$loading.fadeOut(100);
			resetCanvasSize();
			$('#title').show();
			$('#controls').show();
			$c.show();
			setTimeout(
				function () {
					$c.wordCloud({
						wordColor: theme[themeid].wordColor,
						backgroundColor: theme[themeid].backgroundColor,
						fontFamily: theme[themeid].fontFamily,
						gridSize: gridSize,
						weightFactor: weightFactor, //$c[0].offsetHeight*$c[0].offsetWidth/vol*0.5,
						wordList: list,
						abortThreshold: 500,
						abort: changeUIState.too_slow
					});
				},
				0
			);
			return false;
		},
		loading: function (text) {
			$toggleUI.hide();
			$loadingText.text(text);
			$loading.fadeIn(100);
			$('#title').show();
			return false;
		},
		error: function (text) {
			$toggleUI.hide();
			$loading.fadeOut(100);
			$errorText.text(text);
			$error.fadeIn(100);
			return false;
		},
		too_slow: function () {
			$toggleUI.hide();
			$loading.fadeOut(100);
			$('too_slow').show();
			return false;
		}
	};

	// post text processing functions
	
	var postProcessFeedByDomain = {
		'pixnet.net': function (str) {
			return str.replace(/\(.+?\.\.\.\)/g, '');
		},
		'wretch.cc': function (str) {
			return str.replace(/本篇文章引用自此/g, '');
		}
	};
		
	function pass (str) {
		return str;
	}	

	// handleHash

	function handleHash() {
		if (window.location.hash) {
			$c.wordCloud(); // stop current wordCloud;
			switch (window.location.hash.substr(1, 4)) {
				case 'feed':
				updateTitle('feed', window.location.hash.substr(6));
				changeUIState.loading(t('downloading'));
				getFeedText(
					window.location.hash.substr(6),
					postProcessFeedByDomain[
						window.location.hash.substr(6).match(/(\w+.\w+)\//)[1]
					] || pass,
					processingFeed,
					handleText
				);
				return;
				break;
				case 'html':
				updateTitle('html', window.location.hash.substr(6));
				changeUIState.loading(t('downloading'));
				getHTMLText(
					window.location.hash.substr(6),
					pass,
					processingHTML,
					handleText
				);
				return;
				break;
				case 'file':
				var f = $('#file')[0];
				if (!f.files || !f.files.length) {
					// not really getting files, show panel
					$('input[value=file]').attr('checked', true);
					window.location.hash = '#';
					//changeUIState.source();
				} else {
					updateTitle('file', f.files[0].name);
					changeUIState.loading(t('reading'));
					getFileContent(
						f.files,
						pass,
						readingFile,
						handleText
					);
				}
				break;
				//default:
				//do nothing
				//break;
			}
		} else {
			changeUIState.source();
		}
	}

	window.onhashchange = handleHash;
	if (window.location.hash) handleHash(); // only load when hash exists
	else changeUIState.start(); // show start otherwise

	// UI flow buttons

	$('.start').bind(
		'click',
		function () {
			window.location.hash = '#';
			changeUIState.source();
		}
	);
	
	$('.ready').bind(
		'click',
		changeUIState.draw
	);
	
	// Help/about panel
	
	$('.help').bind(
		'click',
		function () {
			$('#help_panel, #help_panel .entry').show();
			return false;
		}
	);
	
	$('#help_panel button').bind(
		'click',
		function () {
			$('#help_panel').hide();
		}
	);
	
	// interaction within source panel
	
	var $s = $('input[name=source]');
	
	function changeSource() {
		var type = this.value.substr(0,4);
		$('.entry').hide();
		$(this).parent().addClass('checked').siblings().removeClass('checked');
		$('#' + type + '_entry').show();
		$('.feed_type_name').text($(this).parent('label').text());
	};
	
	$s.bind(
		'click',
		changeSource
	);
	
	$('#source_panel_form').bind(
		'submit',
		function () {
			switch ($('input[name=source]:checked').val()) {
				case 'demo':
					window.location.hash = '#' + $('input[name=demo]:checked').val();
				break;
				case 'blog:blogger':
					if (!$('#username').val()) return false;
					window.location.hash = '#feed:' + 'http://' + $('#username').val() + '.blogspot.com/feeds/posts/default';
				break;
				case 'blog:pixnet':
					if (!$('#username').val()) return false;
					window.location.hash = '#feed:' + 'http://' + $('#username').val() + '.pixnet.net/blog/feed/rss';
//						function (str) {
	//						return str.replace(/\(.+?\.\.\.\)/g, '');
	//					},
				break;
				case 'blog:wretch':
					if (!$('#username').val()) return false;
					window.location.hash = '#feed:' + 'http://www.wretch.cc/blog/' + $('#username').val() + '&rss20=1';
				break;
				case 'blog:plurk':
					if (!$('#username').val()) return false;
					window.location.hash = '#feed:' + 'http://www.plurk.com/' + $('#username').val() + '.xml';
				break;
				case 'blog:twitter':
					if (!$('#username').val()) return false;
					window.location.hash = '#feed:' + 'http://twitter.com/statuses/user_timeline/' + $('#username').val() + '.rss';
				break;
				case 'feed':
					if (!$('#rss').val()) return false;
					window.location.hash = '#feed:' + $('#rss').val();
				break;
				case 'file':
					if (!$('#file')[0].files.length) return false;
					window.location.hash = '#file';
				break;	
				case 'wiki':
					if (!$('#wikipedia_entry').val()) return false;
					window.location.hash = '#html:' + 'http://zh.wikipedia.org/zh-tw/' + encodeURIComponent($('#wikipedia_entry').val());
				break;
				case 'html':
					if (!$('#html_url').val()) return false;
					window.location.hash = '#html:' + $('#html_url').val();
				break;
			}
			return false;
		}
	);
	
	// get remote resource functions
	
	function getFeedText(url, processText, beforeComplete, complete) {
		$.getJSON(
			'https://ajax.googleapis.com/ajax/services/feed/load?v=1.0&callback=?&scoring=h&num=-1&q=' + processURL(url),
			function (data, status) {
				if (!data.responseData) {
					complete('');
					return;
				}
				beforeComplete(data.responseData.feed.title);
				var text = [];
				data.responseData.feed.entries.forEach(
					function (entry) {
						text.push(processText(entry.title));
						text.push(processText(entry.content).replace(/<[^>]+?>|\(.+?\.\.\.\)|\&\w+\;|<script.+?\/script\>/ig, ''));
					}
				);
				text = text.join('\n');
				setTimeout(
					function () {
						complete(text);
					},
					0
				);
			}
		);
	};

	function getHTMLText(url, processText, beforeComplete, complete) {
		$.getJSON(
			'http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22' + processURL(url) + '%22&format=json&diagnostics=true&callback=?',
			function (data, status) {
				if (!data.query.results) {
					complete('');
					return;
				}
				beforeComplete();
				var text = [];
				
				function parseElementObject(obj) {
					// TBD, properly exclude script
					for (var key in obj) if (obj.hasOwnProperty(key)) {
						if (key === 'script' || key === 'style') continue;
						else if (key === 'content') text.push(obj[key]);
						else if (typeof obj[key] === 'object' && key !== 'script' && key !== 'style') parseElementObject(obj[key]);
					}
				}
				
				parseElementObject(data.query.results);
				text = text.join('\n');
				setTimeout(
					function () {
						complete(text);
					},
					0
				);
			}
		);		
	}

	function getFileContent(files, processText, beforeComplete, complete) {
		var text = '', i = files.length - 1;
		function handleFile() {
			var reader = new FileReader(),
			file = files[i];
			reader.onloadend = function (ev) {
				text += processText(ev.target.result.replace(/<[^>]+?>/g, ''));
				if (!i--) {
					setTimeout(
						function () {
							complete(processText(ev.target.result.replace(/<[^>]+?>|<script.+?\/script\>/ig, '')));
						},
						0
					);
				} else {
					handleFile();
				}
			}
			reader.onerror = function () {
				if (!i--) {
					setTimeout(
						function () {
							complete(text);
						},
						0
					);
				} else {
					handleFile();
				}
			};
			reader.readAsText(file, $('#encoding').val());
		};
		beforeComplete();
		handleFile();
	}

	// helper function
	
	function processURL(url) {
		if (url.indexOf('%') !== -1) {
			return encodeURIComponent(decodeURI(url));
		} else {
			return encodeURIComponent(url);
		}
	}

	function updateTitle(type, title) {
		$('#title')
		.empty()
		.append('<span class="famfamfam_sprite ' + {feed:'feed', html:'drive_world', file:'drive'}[type] + '"></span>')
		.append($('<span />').text(t('title', title)));
	}

	function processingFeed(title) {
		if (title) updateTitle('feed', title);
		changeUIState.loading(t('processing'));
	};

	function processingHTML(title) {
		if (title) updateTitle('html', data.responseData.feed.title);
		changeUIState.loading(t('processing'));
	};

	function readingFile() {
		changeUIState.loading(t('reading'));
	};

	// handleText

	function handleText (text) {
		changeUIState.loading(t('analyzing'));
		if (!text) {
			changeUIState.error(t('errorReading'));
			return;
		}
		wordfreq.empty();
		wordfreq.processText(
			text,
			function () {
				changeUIState.ready();

				list = wordfreq.getSortedList();

				if (list.length < 5) {
					changeUIState.error(t('errorWordCount'));
					return;
				}

				weightFactor = $c[0].offsetHeight * $c[0].offsetWidth / list[0][1] / 3500;
				gridSize = 8;

				var wordLength = list.length.toString(10),
				maxCount = list[0][1].toString(10);


				$c.wordCloud({
					wordColor: theme[themeid].wordColor,
					backgroundColor: theme[themeid].backgroundColor,
					fontFamily: theme[themeid].fontFamily,
					wordList: [
						[t('readyList_1', wordLength, maxCount), t('readyList_1C')],
						[t('readyList_2', wordLength, maxCount), t('readyList_2C')],
						[t('readyList_3', wordLength, maxCount), t('readyList_3C')],
						[t('readyList_4', wordLength, maxCount), t('readyList_4C')]
					],
					abortThreshold: 200,
					abort: changeUIState.too_slow
				});
			}
		);
	};

	// panel functions

	$('.smaller').bind(
		'click',
		function () {
			weightFactor -= 0.1;
			changeUIState.draw();
			return false;
		}
	);

	
	$('.larger').bind(
		'click',
		function () {
			weightFactor += 0.1;
			changeUIState.draw();
			return false;
		}
	);

	$('.changetheme').bind(
		'click',
		function () {
			themeid++;
			if (themeid >= theme.length) themeid = 0;
			$(document.body).css('background-color', theme[themeid].backgroundColor);
			changeUIState.draw();
			return false;
		}
	);

	$('.thiner').bind(
		'click',
		function () {
			gridSize --;
			changeUIState.draw();
			return false;
		}
	);
	
	$('.thicker').bind(
		'click',
		function () {
			gridSize ++;
			changeUIState.draw();
			return false;
		}
	);
	
	$('.save').bind(
		'click',
		function () {
			window.open($c[0].toDataURL());
			return false;
		}
	);
});