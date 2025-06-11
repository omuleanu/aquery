# aquery

A lightweight, JavaScript library designed as a drop-in replacement for jQuery, providing a subset of its functionality using modern JavaScript. `aquery` sets the global `$` and `jQuery` variables (if jQuery is not already present) for seamless integration in web applications and other environments where a compact jQuery-like API is needed.

## Installation

Include the library directly in your HTML via a CDN or local file:

```html
<script src="path/to/aquery.js"></script>
```

## Usage

`aquery` is used via the `$`, mirroring jQuery’s API for DOM manipulation, event handling, and AJAX. If jQuery is already loaded, `aquery` will not override `$` or `jQuery`.

```javascript
// Select elements and manipulate
$('div').addClass('active').css('color', 'blue');

// Handle events
$('#myButton').on('click', () => alert('Clicked!'));

// AJAX request
$.ajax({
    url: '/api/data',
    success: data => console.log(data)
});
```

## Implemented Features

### Static Methods
Available on the `$` (or `jQuery`) object when `aquery` sets these globals, or on `aquery` directly:

- `$.ajax`: Perform AJAX requests.
- `$.each`: Iterate over arrays or objects.
- `$.extend`: Merge objects.
- `$.fn`: Extend the `aquery` prototype.
- `$.get`: Perform a GET AJAX request.
- `$.getScript`: Load and execute a JavaScript file.
- `$.grep`: Filter arrays.
- `$.inArray`: Find an item in an array.
- `$.map`: Transform arrays or objects.
- `$.post`: Perform a POST AJAX request.
- `$.when`: Handle multiple deferred objects.
- `$.Event`: Create custom events.
- Other properties: `arguments`, `caller`, `length`, `name`.

### Instance Methods
Available on `$` instances (e.g., `$('selector')`) when `aquery` sets `$`, or on `aquery('selector')`:

- **DOM Manipulation**: `add`, `addClass`, `after`, `append`, `appendTo`, `attr`, `before`, `clone`, `detach`, `empty`, `html`, `prepend`, `prependTo`, `remove`, `removeAttr`, `removeClass`, `toggleClass`, `wrap`, `wrapAll`.
- **DOM Traversal**: `children`, `closest`, `eq`, `filter`, `find`, `first`, `last`, `next`, `nextAll`, `nextUntil`, `not`, `parent`, `parents`, `prev`, `prevAll`, `prevUntil`.
- **CSS and Positioning**: `css`, `height`, `offset`, `outerHeight`, `outerWidth`, `position`, `scrollLeft`, `scrollTop`, `width`.
- **Events**: `bind`, `click`, `change`, `dblclick`, `focus`, `keydown`, `keyup`, `mousedown`, `mouseup`, `off`, `on`, `one`, `submit`, `trigger`.
- **Data and Serialization**: `data`, `prop`, `serializeArray`, `val`.
- **Utilities**: `each`, `get`, `hasClass`, `index`, `init`, `is`, `map`, `setNodes`, `toArray`.
- **Animations**: `fadeOut`, `hide`, `show`.


- **AJAX Parameters**: The `$.ajax` method supports a simplified set of options compared to jQuery. It accepts an `options` object with the following implemented arguments:
  - `url`: String, required (or passed as first argument).
  - `method` (or `type`): String, HTTP method (defaults to `'get'`).
  - `data`: Object, array, or FormData, the data to send.
  - `traditional`: Boolean, defaults to `true` for GET requests.
  - `dataType`: String, use `'script'` for js file loading.  
  - `success`: Callback function for successful response.
  - `error`: Callback function for errors.
  - `complete`: Callback function after completion.
  - `scriptAttrs`: Object, attributes for script tag when `dataType` is `'script'`.
  Alternatively, pass a URL string as the first argument and an options object as the second. The method uses the modern `fetch` API, triggers `ajaxSend`, `ajaxError`, and `ajaxComplete` events, and returns a promise-like object.

## Notes

- **jQuery Compatibility**: `aquery` sets `$` and `jQuery` globals only if jQuery is not already present.
