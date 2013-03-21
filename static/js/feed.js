var WEBSERVER = 'http://0.0.0.0:5000/';

var GET_QUOTES = WEBSERVER + 'get_quotes';
var GET_QUOTE = WEBSERVER + 'get_quote'
var DELETE_FAV = WEBSERVER + 'delete_fav'
var ADD_FAV = WEBSERVER + 'add_fav';
var DELETE_ECHO = WEBSERVER + 'delete_echo';
var ADD_ECHO = WEBSERVER + 'add_echo';
var ADD_QUOTE = WEBSERVER + 'add_quote';
var ADD_COMMENT = WEBSERVER + 'add_comment';

var FB_GRAPH = 'https://graph.facebook.com/';

var FBID = '1454031404';
// IMPORTANT: go to https://developers.facebook.com/tools/explorer/ to get a new one
var FB_ACCESS_TOKEN = 'AAACEdEose0cBAPrRUlgoqu3PkUTK66zpYLsZChC5S0Yypg5gFtFDD6WaYp0lKugqRmAfucmF02HWFfy2CpdxbGLVnNHGWYxCFzTYNIt5oamKF8QPa';
var FB_FRIENDS_FORMAT = 'https://graph.facebook.com/me/friends?access_token=%s&callback=?';


// globals
var feed = [];
var fbids_to_fetch = {};
var access_token = FB_ACCESS_TOKEN;
var fbid = FBID;
var selected_idx = -1;


function fetchFacebookPeeps() {
    for (var fbid in window.fbids_to_fetch) {
        fetchFacebookProfile(fbid); 
    }
}

function fetchFacebookProfile(fbid) {
    $.ajax({
        'url' : FB_GRAPH + fbid,
        'type' : 'GET',
        'dataType' : 'json',
        'data' : {
            'fields' : 'id,name'
        },
        'success' : onFetchFacebookProfileSuccess,
        'error' : onFetchFacebookProfileFailure
    });
    
}

function onFetchFacebookProfileSuccess(data, textStatus, jqXHR) {
    var fbid = data['id'];
    var doms = window.fbids_to_fetch[fbid];
    for (var i = 0; i < doms.length; i++) {
        quote_dom = $('#' + doms[i].id);
        quote_dom.find('.' + doms[i].class).html(doms[i].prefix + data['name']);
    }
    window.fbids_to_fetch[fbid] = [];
}

function onFetchFacebookProfileFailure(jqXHR, textStatus, errorThrown) {
    genericError(jqXHR, textStatus, errorThrown);
}

function updateFeed() {
    $('.quote-content').attr('style', '');
    window.selected_idx = -1;
    $('#quote').hide();

    $('#update-feed').html('Updating...');
    $.ajax({
        'url' : GET_QUOTES,
        'type' : 'GET',
        'dataType' : 'json',
        'data' : {
            'fbid' : window.fbid 
        },
        'success' : onFeedUpdateSuccess,
        'error' : onFeedUpdateFailure 
    });
}

function onFeedUpdateFailure(jqXHR, textStatus, errorThrown) {
    $('#update-feed').html('Update Feed');
    genericError(jqXHR, textStatus, errorThrown);
}

function onFeedUpdateSuccess(data, textStatus, jqXHR) {
    $('#update-feed').html('Update Feed');
    var container = $('#feed');
    container.empty();
    console.log(data);
    window.feed = [];
    for (var i = 0; i < data.length; i++) {
        var row = {};
        quote = data[i];
        row['quote'] = quote;
        quote_dom = $('#feed-template').clone();

        dom_id = 'quote-' + i.toString();
        quote_dom.attr('id', dom_id);
        row['dom_id'] = dom_id;

        quote_dom.find('.quote-content').html(quote.quote);

        pic_url = FB_GRAPH + quote.sourceFbid + '/picture';
        quote_dom.find('.fb-prof-pic').attr('src', pic_url);
        row['pic_url'] = pic_url;

        quote_dom.find('.quoted-by').html('quoted/echoed by PENDING...');
        row['quoted_by'] = null;
        // record dom_id of quote row so we can update stuff
        // once we fetch the fb user details
        var prfx = 'quoted by ';
        if (quote.is_echo) {
            prfx = 'echoed by ';
        }
        dom_quoted_by_dict = { id: dom_id, class: 'quoted-by', prefix: prfx  };
        if (quote.reporterFbid in window.fbids_to_fetch) {
            window.fbids_to_fetch[quote.reporterFbid].push(dom_quoted_by_dict);
        } else {
            window.fbids_to_fetch[quote.reporterFbid] = [ dom_quoted_by_dict ];
        }

        fav_active_btn = quote_dom.find('.quote-fav-active');
        fav_inactive_btn = quote_dom.find('.quote-fav-inactive');
        echo_active_btn = quote_dom.find('.quote-echo-active');
        echo_inactive_btn = quote_dom.find('.quote-echo-inactive');
        if (quote.user_did_fav) {
            fav_inactive_btn.hide();
            fav_active_btn.show(); 
        }
        if (quote.user_did_echo) {
            echo_inactive_btn.hide();
            echo_active_btn.show();
        } 
        fav_active_btn.data('idx', i);
        fav_inactive_btn.data('idx', i);
        echo_active_btn.data('idx', i);
        echo_inactive_btn.data('idx', i);
        fav_active_btn.click(deleteFavClick);
        fav_inactive_btn.click(addFavClick);
        echo_active_btn.click(deleteEchoClick);
        echo_inactive_btn.click(addEchoClick);

        quote_dom.find('.quote-content').data('idx', i);
        quote_dom.find('.quote-content').click(getQuoteClick);

        var hover_tip = JSON.stringify(quote).replace(/\,"/g, ',<br />"');
        quote_dom.find('.quote-content').qtip({
            content: hover_tip, 
            show: 'mouseover',
            position: {
                corner: {
                    target: 'center',
                    tooltip: 'leftMiddle'
                },
            },
            style: {
                'font-size': 12,
                'line-height': '110%',
                width: 200,
                height: 160,
            }
        });

        quote_dom.show();
        quote_dom.appendTo(container);
        window.feed.push(row);
    }
    fetchFacebookPeeps();
}

function deleteFavClick(event) {
    idx = $.data(this, 'idx');
    quote_id = window.feed[idx]['quote']._id;
    quote_dom = $('#' + window.feed[idx]['dom_id']);
    quote_dom.find('.quote-fav-active').hide();
    quote_dom.find('.quote-fav-inactive').show();
    if (idx == window.selected_idx) {
        $('#quote').find('.quote-fav-active').hide();
        $('#quote').find('.quote-fav-inactive').show();
    }
    console.log(idx + ' delete=> ' + quote_id);
    $.ajax({
        'url' : DELETE_FAV + '/' + quote_id + '/' + window.fbid,
        'type' : 'DELETE',
        'dataType' : 'json',
        'success' : null, 
        'error' : genericError 
    });
}   

function addFavClick(event) {
    idx = $.data(this, 'idx');
    quote_id = window.feed[idx]['quote']._id;
    quote_dom = $('#' + window.feed[idx]['dom_id']);
    quote_dom.find('.quote-fav-active').show();
    quote_dom.find('.quote-fav-inactive').hide();
    if (idx == window.selected_idx) {
        $('#quote').find('.quote-fav-active').show();
        $('#quote').find('.quote-fav-inactive').hide();
    }
    console.log(idx + ' add=> ' + quote_id);
    $.ajax({
        'url' : ADD_FAV,
        'type' : 'POST',
        'dataType' : 'json',
        'data' : {
            'data': JSON.stringify({
                'quoteId' : quote_id,
                'userFbid' : window.fbid 
            })
        },
        'success' : null, 
        'error' : genericError 
    });
}   

function deleteEchoClick(event) {
    idx = $.data(this, 'idx');
    quote_id = window.feed[idx]['quote']._id;
    quote_dom = $('#' + window.feed[idx]['dom_id']);
    quote_dom.find('.quote-echo-active').hide();
    quote_dom.find('.quote-echo-inactive').show();
    if (idx == window.selected_idx) {
        $('#quote').find('.quote-echo-active').hide();
        $('#quote').find('.quote-echo-inactive').show();
    }
    console.log(idx + ' delete=> ' + quote_id);
    $.ajax({
        'url' : DELETE_ECHO + '/' + quote_id + '/' + window.fbid,
        'type' : 'DELETE',
        'dataType' : 'json',
        'success' : null, 
        'error' : genericError 
    });
}   

function addEchoClick(event) {
    idx = $.data(this, 'idx');
    quote_id = window.feed[idx]['quote']._id;
    quote_dom = $('#' + window.feed[idx]['dom_id']);
    quote_dom.find('.quote-echo-active').show();
    quote_dom.find('.quote-echo-inactive').hide();
    if (idx == window.selected_idx) {
        $('#quote').find('.quote-echo-active').show();
        $('#quote').find('.quote-echo-inactive').hide();
    }
    console.log(idx + ' add=> ' + quote_id);
    $.ajax({
        'url' : ADD_ECHO,
        'type' : 'POST',
        'dataType' : 'json',
        'data' : {
            'data': JSON.stringify({
                'quoteId' : quote_id,
                'userFbid' : window.fbid 
            })
        },
        'success' : null, 
        'error' : genericError 
    });
}   

function addQuote() {
    var quote = $('#new-quote-content').val();
    var location = $('#location').val();
    var location_lat = $('#location_lat').val();
    var location_long = $('#location_long').val();
    var sourceFbid = $('#source-fbid').val();
    $('#add-quote').html('Posting...');
    data = {
        'location': location, 
        'location_lat': location_lat,
        'location_long': location_long,
        'quote': quote,
        'reporterFbid': window.fbid,
        'sourceFbid': sourceFbid
    };
    console.log(data);
    $.ajax({
        'url' : ADD_QUOTE,
        'type' : 'POST',
        'dataType' : 'json',
        'data' : {
            'data': JSON.stringify(data)
        },
        'success' : addQuoteSuccess, 
        'error' : addQuoteFailure 
    });
}

function addQuoteSuccess(data, textStatus, jqXHR) {
    clearNewQuote();
    updateFeed();
    alert('quote posted! refreshing feed...');
}

function addQuoteFailure(jqXHR, textStatus, errorThrown) {
    clearNewQuote(); 
    genericError(jqXHR, textStatus, errorThrown);
}

function clearNewQuote() {
    $('#add-quote').html('Post'); 
    $('#new-quote-content').val('something funny');
    $('#source').val('');
    $('#source-fbid').val('');
    $('#location').val('Princeton, NJ');
    $('#location_lat').val('69.69');
    $('#location_long').val('768.69');
    $('#source-fbid').val('');
}

function getQuoteClick(event) {
    idx = $.data(this, 'idx');
    console.log(idx);
    quote_id = window.feed[idx]['quote']._id;
    quote_dom = $('#' + window.feed[idx]['dom_id']);
    $('.quote-content').attr('style', '');
    if (window.selected_idx == idx) {
        window.selected_idx = -1;
        $('#quote').hide();
        // was selected before -- simply unselect
        // TODO clear quote details
        return;
    }
    window.selected_idx = idx;
    quote_dom.find('.quote-content').attr('style', "background-color:orange;");
    console.log(idx + ' get=> ' + quote_id);
    getQuote(quote_id);
}

function getQuote(quote_id) {
    $.ajax({
        'url' : GET_QUOTE,
        'type' : 'GET',
        'dataType' : 'json',
        'data' : {
            'id' : quote_id,
            'userFbid' : window.fbid 
        },
        'success' : getQuoteSuccess, 
        'error' : getQuoteFailure 
    });
}

function getQuoteSuccess(data, textStatus, jqXHR) {
    quote = data;
    quote_dom = $('#quote');

    console.log(quote);

    quote_dom.find('.quote-content').html(quote.quote); 
    pic_url_src = FB_GRAPH + quote.sourceFbid + '/picture';
    quote_dom.find('.fb-prof-pic-source').attr('src', pic_url_src);
    pic_url_rep = FB_GRAPH + quote.reporterFbid + '/picture';
    quote_dom.find('.fb-prof-pic-reporter').attr('src', pic_url_rep);

    quote_dom.find('.echoes').html(quote.echo_count + ' echoes');
    quote_dom.find('.likes').html(quote.fav_count + ' likes');
    quote_dom.find('.created').html(jQuery.timeago(new Date(quote.timestamp * 1000)));

    // record dom_id of quote row so we can update stuff
    // once we fetch the fb user details
    var prfx = 'quoted by ';
        if (quote.is_echo) {
            prfx = 'echoed by ';
        }
    dom_quoted_by_dict = { id: 'quote', class: 'quoted-by', prefix: prfx };
    if (quote.reporterFbid in window.fbids_to_fetch) {
        window.fbids_to_fetch[quote.reporterFbid].push(dom_quoted_by_dict);
    } else {
        window.fbids_to_fetch[quote.reporterFbid] = [ dom_quoted_by_dict ];
    }
    dom_source_dict = { id: 'quote', class: 'source', prefix: '' }
    if (quote.sourceFbid in window.fbids_to_fetch) {
        window.fbids_to_fetch[quote.sourceFbid].push(dom_source_dict);
    } else {
        window.fbids_to_fetch[quote.sourceFbid] = [ dom_source_dict ];
    } 
    quote_dom.find('.quoted-by').html('quoted by PENDING')
    quote_dom.find('.source').html('AUTHOR PENDING')

    fav_active_btn = quote_dom.find('.quote-fav-active');
    fav_inactive_btn = quote_dom.find('.quote-fav-inactive');
    echo_active_btn = quote_dom.find('.quote-echo-active');
    echo_inactive_btn = quote_dom.find('.quote-echo-inactive');
    if (quote.user_did_fav) {
        fav_inactive_btn.hide();
        fav_active_btn.show(); 
    } else {
        fav_inactive_btn.show();
        fav_active_btn.hide();
    }
    if (quote.user_did_echo) {
        echo_inactive_btn.hide();
        echo_active_btn.show();
    } else {
        echo_inactive_btn.show();
        echo_active_btn.hide();
    }
    fav_active_btn.data('idx', window.selected_idx);
    fav_inactive_btn.data('idx', window.selected_idx);
    echo_active_btn.data('idx', window.selected_idx);
    echo_inactive_btn.data('idx', window.selected_idx);
    fav_active_btn.click(deleteFavClick);
    fav_inactive_btn.click(addFavClick);
    echo_active_btn.click(deleteEchoClick);
    echo_inactive_btn.click(addEchoClick);

    var hover_tip = JSON.stringify(quote).replace(/\,"/g, ',<br />"');
    quote_dom.find('.quote-content').qtip({
        content: hover_tip, 
        show: 'mouseover',
        position: {
            corner: {
                target: 'center',
                tooltip: 'leftMiddle'
            },
        },
        style: {
            'font-size': 12,
            'line-height': '110%',
            width: 200,
            height: 300,
        }
    });

    fetchFacebookPeeps();
    quote_dom.show();

    var container = $('#comments');
    container.empty();
    comments = quote.comments;
    for (var i = 0; i < comments.length; i++) {
        comment = comments[i];
        comment_dom = $('#comment-template').clone();

        dom_id = 'comment-' + i.toString();
        comment_dom.attr('id', dom_id);

        comment_dom.find('.comment-content').html(comment.comment);
        comment_dom.find('.comment-name').html(comment.name);
        comment_dom.find('.fb-prof-pic').attr('src', comment.picture_url);
        comment_dom.find('.created').html(jQuery.timeago(new Date(comment.timestamp * 1000)));

        comment_dom.show();
        comment_dom.appendTo(container);
    }

}

function getQuoteFailure(jqXHR, textStatus, errorThrown) {
    genericError(jqXHR, textStatus, errorThrown);
}

function addComment() {
    var quote_id = window.feed[selected_idx]['quote']._id;
    var comment = $('#new-comment-content').val();
    $('#add-comment').html('Posting...');
    $.ajax({
        'url' : ADD_COMMENT,
        'type' : 'POST',
        'dataType' : 'json',
        'data' : {
            'data': JSON.stringify({
                'userFbid' : window.fbid,
                'quoteId' : quote_id,
                'comment' : comment
            })
        },
        'success' : addCommentSuccess, 
        'error' : addCommentFailure 
    });
}

function addCommentSuccess(data, textStatus, jqXHR) {
    clearNewComment();
    var quote_id = window.feed[selected_idx]['quote']._id; // this will fuck up big time if the quote is unselected in the meantime
    getQuote(quote_id);
}

function addCommentFailure(jqXHR, textStatus, errorThrown) {
    clearNewComment();
    genericError(jqXHR, textStatus, errorThrown);
}

function clearNewComment() {
    $('#add-comment').html('Comment');
    $('#new-comment-content').val('');
}

$.urlParam = function(name){
    var results = new RegExp('[\\?&amp;]' + name + '=([^&amp;#]*)').exec(window.location.href);
    if (!results) return 0;
    return results[1] || 0;
}

$(document).ready(function() {
    $('#update-feed').click(updateFeed);
    updateFeed();

    $('#add-quote').click(addQuote);
    $('#add-comment').click(addComment);

    window.access_token = $.urlParam('access_token');
    if (!window.access_token) {
        window.access_token = FB_ACCESS_TOKEN;
    }
    window.fbid = $.urlParam('fbid');
    if (!window.fbid) {
        window.fbid = FBID;
    }

    fb_friends_url = sprintf(FB_FRIENDS_FORMAT, access_token);
    $("#source").autocomplete({
        source: function(request, add) {
            $this = $(this)
            // Call out to the Graph API for the friends list
            $.ajax({
                url: fb_friends_url,
                dataType: "jsonp",
                success: function(results){
                    // Filter the results and return a label/value object array  
                    var formatted = [];
                    console.log(results);
                    if (!results.data) alert('You FB access token is wrong! Go to the FB Graph Explorer, get a working one, and pass it in the url as ?access_token=...');
                    for(var i = 0; i< results.data.length; i++) {
                        if (results.data[i].name.toLowerCase().indexOf($('#source').val().toLowerCase()) >= 0)
                        formatted.push({
                            label: results.data[i].name,
                            fbid: results.data[i].id
                        })
                    }
                    add(formatted);
                }
            });
        },
        select: function(event, ui) {
            // Fill in the input fields
            $('#source').val(ui.item.label)
            $('#source-fbid').val(ui.item.fbid)
            // Prevent the value from being inserted in "#name"
            return false;
        },
        minLength: 2
    });

});
