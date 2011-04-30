// ==UserScript==
// @name          Amazon International Links
// @author        chocolateboy
// @copyright     chocolateboy
// @namespace     http://chocolatey.com/code/js
// @version       0.31
// @license       GPL: http://www.gnu.org/copyleft/gpl.html
// @description   Add international links to Amazon product pages
// @include       http://www.amazon.at/*
// @include       http://www.amazon.ca/*
// @include       http://www.amazon.cn/*
// @include       http://www.amazon.co.jp/*
// @include       http://www.amazon.com/*
// @include       http://www.amazon.co.uk/*
// @include       http://www.amazon.de/*
// @include       http://www.amazon.fr/*
// @include       https://www.amazon.at/*
// @include       https://www.amazon.ca/*
// @include       https://www.amazon.cn/*
// @include       https://www.amazon.co.jp/*
// @include       https://www.amazon.com/*
// @include       https://www.amazon.co.uk/*
// @include       https://www.amazon.de/*
// @include       https://www.amazon.fr/*
// @require       http://userscripts.org/scripts/version/79691/262311.user.js
// @require       https://github.com/sizzlemctwizzle/GM_config/raw/master/gm_config.js
// @require       https://sprintf.googlecode.com/files/sprintf-0.7-beta1.js
// @require       http://documentcloud.github.com/underscore/underscore-min.js
// ==/UserScript==

/*
 * @requires:
 *
 * jQuery 1.4.2 for Greasemonkey
 *
 *     http://userscripts.org/scripts/show/79691
 *
 * GM_config
 *
 *     http://userscripts.org/groups/68
 *
 * sprintf() for JavaScript
 *
 *     http://www.diveintojavascript.com/projects/javascript-sprintf
 *
 * Underscore.js utility library
 *
 *     http://documentcloud.github.com/underscore/
 */

/*
 *
 * further reading:
 *
 *     http://helpful.knobs-dials.com/index.php/Amazon_notes#Links
 */

/*********************** Constants ********************************/

// these are all initialized lazily (hence "var" instead of "const")
// XXX this is pointless if thousands of lines of jQuery, sprintf &c. are executed for every Amazon page
var $ASIN, $CROSS_SITE_LINK_CLASS, $CURRENT_TLD, $LINK, $LINKS, $PROTOCOL, $SEPARATOR, $SITES;

// convenience function to reduce the verbosity of Underscore.js chaining
// see: http://github.com/documentcloud/underscore/issues/issue/37
function __($obj) { return _($obj).chain() }

/*********************** Functions ********************************/

// lazily initialze constants - these are only assigned if the ASIN is found
function initializeConstants($asin) {
    var $location = document.location;

    $ASIN = $asin; // the unique Amazon identifier for this product
    $CROSS_SITE_LINK_CLASS = 'navCrossshopYALink'; // the CSS class for cross-site links
    $CURRENT_TLD = $location.hostname.substr('www.amazon.'.length); // one of the 8 current Amazon TLDs
    $LINK = $('a.' + $CROSS_SITE_LINK_CLASS).eq(-2); // the penultimate Amazon cross-site link e.g. "Your Account"
    $LINKS = []; // an array of our added elements - jQuery objects representing alternating links and separators
    $PROTOCOL = $location.protocol; // http: or https:
    $SEPARATOR = $LINK.next(); // a span with a spaced vertical bar
    $SITES = { // a map from the Amazon TLD to the corresponding two-letter country code
        'at'    : 'AT',
        'ca'    : 'CA',
        'cn'    : 'CN',
        'de'    : 'DE',
        'fr'    : 'FR',
        'co.jp' : 'JP',
        'co.uk' : 'UK', // technically (shmecnically), this should be GB: http://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
        'com'   : 'US'
    };
}

// build the underlying data model used by the GM_config utility
function initializeConfig() {
    var $checkboxes = __($SITES).keys().foldl(
        function($fields, $tld) {
            var $country = $SITES[$tld];
            $fields[$tld] = {
                type: 'checkbox',
                label: $country,
                title: sprintf('amazon.%s', $tld),
                default: ($country == 'UK' || $country == 'US')
            };
            return $fields;
        },
        {}
    ).value();

    // re-render the links if the settings are updated
    var $callbacks = {
        save: function() { removeLinks(); addLinks() }
    };

    GM_config.init('Amazon International Links Settings', $checkboxes, $callbacks);
}

// display the settings manager
function showConfig() {
    GM_config.open();
}

// return the subset of the TLD -> country code map ($SITES) corresponding to the enabled sites
function getConfiguredSites() {
    return __($SITES).keys().foldl(
        function($sites, $tld) {
            if (GM_config.get($tld)) {
                $sites[$tld] = $SITES[$tld];
            }
            return $sites;
        },
        {}
    ).value();
}

// remove all added links from the DOM and clear the array referencing them
function removeLinks() {
    _($LINKS).each(function($el) { $el.remove() });
    $LINKS.length = 0; // clear the array of links and separators
}

// populate an array of links and display them by prepending them to the body of the cross-site navigation bar
function addLinks() {
    var $sites = getConfiguredSites();

    if (!_.isEmpty($sites)) {
        var $tlds = __($sites).keys().sortBy(function($tld) { return $sites[$tld] }).value();

        _($tlds).each(function($tld) {
            var $country = $sites[$tld];
            var $html;

            if ($tld == $CURRENT_TLD) {
                $html = sprintf('<strong title="amazon.%s">%s</strong>', $tld, $country);
            } else {
                $html = sprintf(
                    '<a href="%s//www.amazon.%s/dp/%s" class="%s" title="amazon.%2$s>%s</a>',
                    $PROTOCOL, $tld, $ASIN, $CROSS_SITE_LINK_CLASS, $country
                );
            }

            $LINKS.push($($html), $SEPARATOR.clone());
        });

        // prepend the cross-site links to the "Your Account" link
        $LINK.before.apply($LINK, $LINKS);
    }
}

/*********************** Main ********************************/

var $temp = $('#ASIN');

if ($temp.length) {
    initializeConstants($temp.val());
    initializeConfig();
    GM_registerMenuCommand('Configure Amazon International Links', showConfig);
    addLinks();
}