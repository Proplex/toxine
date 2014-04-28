/* toxine.js
 * 
 * Browser-based Tox instant messaging client.
 * 
 * Camilo Polymeris, 2014
 * 
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
 * MA 02110-1301, USA.
 * 
 */

const UPDATE_INTERVAL = 250; //milliseconds

var tox = null;

// JS detected!
$('#js-warning').hide();
$('#wrap').css('visibility', 'visible');

// Setup main entry points
$(window).on('load', setup);
$(window).on('beforeunload', cleanup);

try
{
    this['Module'] = Module;
    Module.test;
}
catch(e)
{
    this['Module'] = Module = {};
}

Module['preRun'] = Module['preRun'] || [];
Module['preRun'].push(createDevRandom);

function createDevRandom() 
{
    function randombyte()
    {
        var buf = new Int8Array(1);            
        window.crypto.getRandomValues(buf);
        return buf[0];
    }
        
    FS.init();
    var devFolder = FS.findObject('/dev') || Module['FS_createFolder']('/', 'dev', true, true);    
    Module['FS_createDevice'](devFolder, 'random', randombyte);
    Module['FS_createDevice'](devFolder, 'urandom', randombyte);    
}

function setup()
{  
    setupUI();
    setupTox();
    $('#loading').css('visibility', 'hidden');
}

function setupUI()
{  
    console.log('Setting up UI');
    /** ADD/REMOVE CONTACTS */
    $('#add-contact-dialog').dialog(
    {
        width: '500px',
        resizable: false,
        autoOpen: false,
        buttons: { 'Add': function() {  } }
    });
    
    $('#sidebar-add-contact').button({ icons: { primary:'ui-icon-plus' }, text: false })
        .click(function () { $('#add-contact-dialog').dialog('open'); });
    $('#add-contact-button').click(function () { $('#add-contact-dialog').dialog('open'); });
    $('#sidebar-remove-contact').button({ icons: { primary:'ui-icon-minus' }, text: false });
    
    /** PROFILE */
    $('#profile-dialog').dialog(
    {
        width: '500px',
        resizable: false,
        autoOpen: false,
    });
    
    $('#profile-dialog-copy').button({ icons: { primary:'ui-icon-clipboard' } });
    $('#profile-dialog-qr').button();
    $('#profile-dialog-nospam').button({ icons: { primary:'ui-icon-arrowrefresh-1-s' } });
    
    $('#sidebar-profile').button({ icons: { primary:'ui-icon-person' }, text: false })
        .click(function () { $('#profile-dialog').dialog('open'); });
    
    /** CREDENTIALS */
    $('#credentials-dialog').dialog(
    {
        width: '500px',
        modal: true,
        resizable: false,
        autoOpen: false,
    });
    
    $('#credentials-dialog-encrypt').button();
    $('#credentials-dialog-download').button({ icons: { primary:'ui-icon-arrowthick-1-s' } });
    $('#credentials-dialog-clear').button({ icons: { secondary:'ui-icon-trash' } })
        .click(function ()
        {
            showWarning(
                'Your profile and contact list will be irrevocably deleted and a new Tox ID ' +
                'will be generated. Are you sure?',
                function()
                {
                    delete localStorage.data;
                    loadOrNew();
                });
        });
    
    $('#sidebar-credentials').button({ icons: { primary:'ui-icon-contact' }, text: false })
        .click(function () { $('#credentials-dialog').dialog('open'); });
    
    /** SETTINGS */
    $('#settings-dialog-port').spinner();
    $('#settings-dialog').dialog(
    {
        width: '500px',
        modal: true,
        resizable: false,
        autoOpen: false,
        buttons: { 'Apply': function () {} }
    });
    
    $('#settings-dialog-custom').button();
    $('#sidebar-settings').button({ icons: { primary:'ui-icon-gear' }, text: false })
        .click(function () { $('#settings-dialog').dialog('open'); });

    /** WARNING DIALOG */
    $('#warning-dialog').dialog(
    {
        width: '300px',
        modal: true,
        resizable: false,
        autoOpen: false
    });
    
    
    /** SIDEBAR & CONTACT LIST */
    $('#user-name').editable();
    $('#user-status').editable();
    
    $('#sidebar-aliases').button({ icons: { primary:'ui-icon-tag' }, text: false });
    
    /** CHAT */
    $('#chat-send').button({ icons: { primary:'ui-icon-comment' }, text: false });
    $('#chat-attach').button({ icons: { primary:'ui-icon-document' }, text: false });
}

function showWarning(msg, okFunction)
{
    $('#warning-dialog-text').html(msg);
    $('#warning-dialog').dialog(
        {
            buttons: 
            {
                'OK': function ()
                {
                    okFunction();
                    $('#warning-dialog').dialog('close');
                },
                'Cancel': function ()
                {
                    $('#warning-dialog').dialog('close');
                }
            }
        })
        .dialog('open');
}

function setupTox()
{
    tox = Module;
    
    loadOrNew();
}

function reset()
{
    $('#profile-dialog-tox-id').html(tox.getId());
    
    console.log('Connecting to boostrap node(s)');
    tox.connected = false;
    var hexid = '051B599C255428ABA13DCC3728B22291799C9CBC1081C5AD0B1F972C787E6562';
    tox.bootstrap('127.0.0.1', 33445, hexid);
    update();
    if (tox.connected)
    {
        console.log('Connected, updating every', UPDATE_INTERVAL, 'ms');
        setInterval(update, UPDATE_INTERVAL);
    }
}

function save()
{
    console.log('Saving credentials');
    var data = tox.save('');
    delete localStorage.encrypted
    localStorage.data = data;
}

function loadOrNew()
{
    var data = localStorage.data;
    if (data == null || data == '')
    {
        console.log('No saved credentials found, creating new ones');
        console.log('This may take up to a couple minutes');
        tox.setup();
        save();
        reset();
        return;
    }
    console.log('Initializing tox & loading existing credentials');
    console.log('This may take up to a couple minutes');
    tox.setup();
    if (!tox.load(data, ''))
    {
        console.log('Error loading credentials, creating new ones');
        save();
    }
    reset();
}

function cleanup()
{
    console.log('Exiting');
    if (tox)
        tox.cleanup();
}

function update()
{
    tox.connected = tox.update();
}

function idToHexString(id)
{
    ret = []
    for (i = 0; i < id.length; i++)
        ret[i] = id.charCodeAt(i).toString(16).toUpperCase();
    return ret;
} 

function hexStringToId(str)
{
    // remove whitespace
    str = str.replace(/\s+/g, '');
    ret = []
    // group in pairs of hex digits
    pairs = str.match(/../g)
    for (i = 0; i < pairs.length; i++)
    {
        ret[i] = parseInt(pairs[i], 16);
        if (ret[i] == NaN)
        {
            console.log('Error parsing hex string: %s', str);
            return false;
        }
    }
    return ret;
}
