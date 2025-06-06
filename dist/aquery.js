// aquery
(function ($) {
    const aq = aquery = function (arg, arg2) {
        return new aquery.fn.init(arg, arg2);
    };

    const dataWeakMap = new WeakMap();
    const displayWeakMap = new WeakMap();

    const isUndef = o => o === undefined;
    const isStr = (arg) => typeof arg === 'string';
    const isFunc = (arg) => typeof arg === 'function';
    const isAquery = (arg) => arg instanceof aquery && arg?.nodes;
    const isObject = (obj) => typeof obj === 'object' && !isNull(obj);

    if (isUndef($)) {
        jQuery = $ = window.$ = window.jQuery = window.aquery = aquery;
    }

    const toLoadOnReady = [];
    let ready = false;
    const onDocReady = func => {
        if (ready) {
            // timeout to let inline scripts execute before doc.ready
            setTimeout(func);
        }
        else {
            toLoadOnReady.push(func);
        }
    };

    document.addEventListener('DOMContentLoaded', function () {
        ready = true;
        // Using setTimeout to delay function execution.
        // If f starts a Promise.all([plain value]).then(f1), f1 will execute before the next iteration of loop due to Promise microtask queue processing.
        loop(toLoadOnReady, f => setTimeout(f));
        //loop(toLoadOnReady, f => { f(); });        
    });

    const addClasses = (elm, name) => elm.classList.add(...(name || '').trim().split(' ').filter(Boolean));
    const remClasses = (elm, name) => elm.classList.remove(...(name || '').trim().split(' ').filter(Boolean));
    const toggleClasses = (element, classes) => {
        classes.split(' ').filter(Boolean).forEach(cls => element.classList.toggle(cls));
    };

    aquery.extend = function (a, b) {
        if (a === true) {
            // deep clone                
            const [, ...nargs] = arguments;
            return extend(...nargs);
        }

        if (len(arguments) === 1) {
            return Object.assign(this, a);
        }

        return Object.assign(...arguments);
    }

    function isAdeferred(p) {
        return p instanceof adeferred;
    }

    function mergeErrIntoAdeferred(err, adf) {
        if (err) {
            adf.errorThrown = err;
            adf.statusText = err.message;
            adf.status = err?.response.status;
        }
    }

    const adeferred = function (arg) {
        if (len(arguments) > 1) {
            this.args = arguments;
            const allprom = [...arguments]
                .map(prom => isAdeferred(prom) ? prom.promise : prom);
            this.promise = Promise.all([...allprom]);
        }
        else if (isFunc(arg?.then)) {
            if (isAdeferred(arg)) {
                this.adeferred = arg;

                if (arg.res) {
                    if (arg.res instanceof Promise) {
                        this.promise = arg.res
                    }
                    else {
                        this.res = arg.res;
                    }
                }
                else if (arg.promise) {
                    this.promise = arg.promise;
                }
            }
            else {
                this.promise = arg;
            }
        }
        else {
            this.res = arg;
        }
    }

    function then(success, failure) {
        const self = this;
        if (isUndef(self.promise)) {
            let sres = success(self.res);
            self.res = sres;
        } else {
            const failureFunc = failure ? (arg1) => {
                mergeErrIntoAdeferred(arg1, self);
                failure(self);
            } : null;

            self.promise = self.promise.then(
                function (res) {
                    const ares = self.adeferred?.res;
                    if (ares) {
                        res = ares;
                    }

                    let sres;
                    if (self.args) {
                        const pairedResults = res.map((result, i) => {
                            const thennable = self.args[i];
                            const status = thennable.statusText;
                            if (thennable.res) {
                                result = thennable.res;
                            }

                            return status ? [result, status] : result;
                        });

                        sres = success(...pairedResults);
                    }
                    else {
                        sres = success(res);
                    }

                    self.res = sres || res;
                    self.statusText = null;

                    return sres || res;
                },
                failureFunc);
        }

        return self;
    }

    adeferred.prototype.done = adeferred.prototype.then = then;

    adeferred.prototype.fail = function (func) {
        if (!isUndef(this.promise)) {
            this.promise.catch((err) => {
                mergeErrIntoAdeferred(err, this);
                func(this);
            })
        }

        return this;
    }

    adeferred.prototype.always = function () {
        const alwaysArgs = arguments;
        const exec = () => loop(alwaysArgs, f => f());

        if (!isUndef(this.promise)) {
            this.promise.finally(exec);
        }
        else {
            exec();
        }

        return this;
    };

    aq.when = function () {
        return new adeferred(...arguments);
    }

    aq.getScript = (url, success) => aq.ajax({ url, dataType: 'script', success });

    aq.ajax = function (options, opt2) {
        let url1;
        if (isStr(options)) {
            url1 = options;
            options = opt2;
        }

        let { url, data, traditional, error, dataType, contentType } = options;

        let method = options.method || options.type || 'get';

        if (url1) {
            url = url1;
        }

        method = method.toLowerCase();

        if (method == 'get') traditional = true;

        function serializeData(data) {
            if (!data) return '';
            if (!traditional && contentType == 'application/json') { return JSON.stringify(data); }

            if (!Array.isArray(data)) {
                data = serlObj(data);
            }

            return data.map(item => { return encodeURIComponent(item.name) + '=' + encodeURIComponent(item.value); }).join('&');
        }

        const fetchOptions = {
            method: method, headers: { "X-Requested-With": "XMLHttpRequest" }
        };

        if (method === 'get') {
            const queryString = serializeData(data);
            if (queryString) {
                url += url.includes('?') ? `&${queryString}` : `?${queryString}`;
            }
        }
        else {
            if (data instanceof FormData) {
                fetchOptions.body = data;
                // Content-Type is handled automatically by the browser
            }
            else {
                fetchOptions.body = serializeData(data);
                fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
        }

        const promise = fetch(url, fetchOptions);

        aq(document).trigger('ajaxSend', [promise, options]);

        const xhr = aquery.when(promise
            .then(response => {
                const contentType = response.headers.get('Content-Type');

                if (!response.ok) {
                    return response.text().then(text => {
                        let err = new Error(response.statusText);
                        err.response = response;
                        err.responseText = text;

                        throw err;
                    });
                }

                xhr.statusText = response.statusText;

                if (contentType && contentType.includes('application/json')) {
                    return response.json();
                } else {
                    return response.text();
                }
            })
            .then(data => {
                if (dataType == 'script') {
                    const scriptElement = document.createElement('script');
                    scriptElement.text = data;

                    if (options.scriptAttrs) {
                        for (const [key, value] of Object.entries(options.scriptAttrs)) {
                            scriptElement.setAttribute(key, value);
                        }
                    }

                    document.head.appendChild(scriptElement).parentNode.removeChild(scriptElement);
                }

                options.success && options.success(data);
                return data;
            })
            .catch(err => {
                aq(document).trigger('ajaxError', [promise, options, err]);
                error && error(err);
                throw err;
            })
            .finally(() => {
                options.complete && options.complete();
                aq(document).trigger('ajaxComplete', [promise, options]);
            }));

        return xhr;
    }

    aq.get = function (urlOrOpt, data, success, { method } = {}) {
        if (isFunc(data)) {
            success = data;
            data = null;
        }

        if (urlOrOpt.url) {
            urlOrOpt.method = 'post';
            return aq.ajax(urlOrOpt, data, success);
        }

        return aq.ajax({ url: urlOrOpt, data, success, method });
    }

    aq.post = (url, data, success) => aq.get(url, data, success, { method: 'post' });

    aq.inArray = (val, arr) => Array.from(arr).indexOf(val);

    aq.grep = (array, callback) => array.filter((item, index) => callback(item, index));

    aq.each = (array, f) => loop(array, function (it, ix) { return f(ix, it) });

    aq.Event = function (type) {
        const [name, namespace] = type.split('.', 2);
        const initDict = { cancelable: true, bubbles: true, isTrusted: true };
        let init = name == 'click' ? MouseEvent : Event;
        let ev = new init(name, initDict);
        ev.namespace = namespace;

        return ev;
    };

    aq.map = (array, f) => array.map(f);

    const isSelector = (node, selector) => {
        if (!node.matches) return;
        if (isNullOrEmp(selector)) {
            return true;
        }

        const res = customSelector([node], selector, { useFilter: 1 });
        return len(res) === 1;
    };

    const closestRanked = (node, selector) => {
        const closestRankRed = (node, selector, rank) => {
            if (!node) return;
            if (isSelector(node, selector)) return [node, rank];
            return closestRankRed(node.parentNode, selector, rank + 1);
        };

        return closestRankRed(node, selector, 0);
    };

    const closestSelector = (node, selector) => {
        if (!node.closest) return;

        const res = closestRanked(node, selector);
        if (len(res)) return res[0];
    }

    const recalcAqArr = aqthis => {
        loop(aqthis.nodes, (n, i) => aqthis[i] = n);
        aqthis.length = len(aqthis.nodes);
    };

    function remNode(n, detach) {
        if (!detach) {
            n.aweEvs = null;
        }

        n.remove();
    }

    // force reflow, for subsequent .css changes transitions to work
    const reflow = self => {
        const f = firstNode(self)
        if (f) f.offsetWidth;
        return self;
    };

    aquery.fn = aquery.prototype = {
        init: function (arg, arg2) {

            if (isFunc(arg)) {
                onDocReady(arg, arg2);
                return;
            }

            // html
            if (typeof arg === 'string' && arg.startsWith('<')) {
                arg = strToNode(arg);
            }

            this.setNodes(arg);

            return this;
        },
        get: function (i) {
            if (isUndef(i)) {
                return this.nodes;
            }

            return this.nodes[i];
        },
        ajaxComplete: function (func) {
            return aq(document).on('ajaxComplete', func);
        },
        ajaxError: function (func) {
            return aq(document).on('ajaxError', func);
        },
        wrap: function (str) {
            const wrapperNode = strToNode(str);
            this.before(wrapperNode);
            this.appendTo(wrapperNode);
            return this;
        },
        wrapAll: function (str) {
            const f = firstNode(this);
            if (f) {
                const wrap = strToNode(str);
                this.parent().append(wrap);
                loop(this.nodes, n => aquery(wrap).append(n));
            }

            return this;
        },
        each: function (func) {
            loop(this.nodes, function (node, i) {
                return func.call(node, i, node);
            });
            return this;
        },
        data: function (name, val) {
            const f = firstNode(this);
            const rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/; // test for json 
            if (f) {
                let elmData = dataWeakMap.get(f) || {};

                if (len(arguments) == 0) {
                    return elmData;
                }

                if (len(arguments) == 1) {

                    if (isObject(name)) {
                        elmData = aq.extend({}, elmData, name);
                        dataWeakMap.set(f, elmData);
                        return this;
                    }

                    let data = elmData[name];

                    if (isUndef(data) && f.dataset) {
                        data = f.dataset[name];

                        if (typeof data === "string") {
                            try {
                                data = data === "true" ? true :
                                    data === "false" ? false :
                                        data === "null" ? null :
                                            +data + "" === data ? +data : // <- This line converts numeric string to Number
                                                rbrace.test(data) ? JSON.parse(data) : data;
                            } catch (e) { }
                        }
                    }

                    return data;
                }

                // set
                elmData[name] = val;
                dataWeakMap.set(f, elmData);

                return this;
            }
        },
        first: function () {
            return aquery(firstNode(this));
        },
        last: function () {
            const nodes = this.nodes;
            const l = len(nodes);

            if (l) {
                return aquery(nodes[l - 1]);
            }

            return aquery();
        },
        toArray: function () {
            return Array.from(this);
        },
        find: function (selector) {
            const res = new Set();

            loop(this.nodes, n => {
                customSelector([n], selector).forEach(r => res.add(r));
            });

            return aquery(Array.from(res));
        },
        children: function (selector) {
            const res = new Set();
            loop(this.nodes, n => {
                customSelector(Array.from(n.children), selector, { useFilter: 1 }).forEach(r => res.add(r));
            });

            return aquery(Array.from(res));
        },
        nextUntil(selector, filterStr, { prev } = {}) {
            const res = new Set();
            const nxprop = prev ? 'previousElementSibling' : 'nextElementSibling';
            loop(this.nodes, n => {
                let nx = n[nxprop];

                while (nx) {
                    if (isSelector(nx, selector)) {
                        break;
                    }

                    if (isSelector(nx, filterStr)) {
                        res.add(nx);
                    }
                    nx = nx[nxprop];
                }
            });

            return aq(Array.from(res));
        },
        prevUntil(selector, filterStr) {
            return this.nextUntil(selector, filterStr, { prev: 1 });
        },
        filter: function (arg) {
            let res;
            if (isStr(arg)) {
                res = customSelector(this.nodes, arg, { useFilter: 1 });
            }

            if (isFunc(arg)) {
                res = (this?.nodes || []).filter((n, i) => arg.call(n, i, n));
            }

            return aquery(res);
        },
        closest: function (arg) {
            function isAncestor(current, nodeWeLookFor) {
                if (isNull(current)) return;
                if (current === nodeWeLookFor) return true;
                return isAncestor(current.parentNode, nodeWeLookFor);
            }

            const f = firstNode(this);
            if (f) {
                if (isStr(arg)) {
                    return aquery(closestSelector(f, arg));
                }
                else {
                    let argNode = isAquery(arg) ? firstNode(arg) : arg;
                    if (isAncestor(f, argNode)) {
                        return aquery(argNode);
                    }
                }
            }

            return aquery();
        },
        parents: function (arg) { return this.closest(arg); },
        attr: function (name, val) {
            if (isUndef(val)) {
                const f = firstNode(this);
                if (f && f.getAttribute) {
                    return f.getAttribute(name);
                }
                return null;
            }
            else {
                loop(this.nodes, n => n && n.setAttribute && n.setAttribute(name, val));
                return this;
            }
        },
        removeAttr: function (name) {
            loop(this.nodes, n => n.removeAttribute(name));
            return this;
        },
        css: function (prop, val) {
            let objval;

            const setStyle = (n, prop, val) => {
                prop = prop.toLowerCase();
                const nrprops = ["left", "top", "right", "bottom", "width", "height"];

                if (nrprops.some(w => prop.endsWith(w))) {
                    if (typeof val === 'number') {
                        val = `${val}px`;
                    }
                }

                n.style[prop] = val;
            }

            if (typeof prop === 'object') {
                objval = prop;
            }

            if (len(arguments) === 1 && !objval) {
                const f = firstNode(this)
                if (f) {
                    return window.getComputedStyle(f)[prop];
                }
            }
            else {
                loop(this.nodes, n => {
                    if (objval) {
                        loop(Object.entries(objval), ([k, v]) => { setStyle(n, k, v); });
                    }
                    else {
                        setStyle(n, prop, val);
                    }
                });
            }

            return this;
        },
        outerHeight: function (p1, p2, { horiz } = {}) {
            let includeMargin, valToSet;

            if (!isNull(p1)) {
                if (isBool(p1)) {
                    includeMargin = p1;
                }
                else {
                    valToSet = p1;
                    includeMargin = p2;
                }
            }

            const f = firstNode(this);
            if (f) {
                const prop = horiz ? 'Width' : 'Height';
                const outer = includeMargin ? 2 : 1;

                if (valToSet) {
                    // remove space from valToSet                    
                    return this.height(valToSet, { outer, horiz });
                }

                if (f == window) return window[`outer${prop}`];
                if (f == document) return f.documentElement[`scroll${prop}`];
                if (!isVisible(f)) return 0;

                return getDimForElm(f, { outer, horiz });
            }
        },
        outerWidth: function (includeMargin, arg2,) {
            return this.outerHeight(includeMargin, arg2, { horiz: 1 });
        },
        height: function (val, { outer, horiz = 0 } = {}) {
            const f = firstNode(this),
                isGet = isUndef(val);

            if (f) {
                if (isGet) {
                    if (f == window)
                        return document.documentElement[horiz ? 'clientWidth' : 'clientHeight'];

                    if (f == document)
                        return f.documentElement[horiz ? 'scrollWidth' : 'scrollHeight'];
                    if (!isVisible(f)) return 0;
                }

                if (isGet) {
                    return getDimForElm(f, { content: 1, bord: 1, horiz });
                }

                let borderAndPad = getDimForElm(f, { bord: 1, horiz })

                if (outer) {
                    //set outerHeight(val)
                    borderAndPad = 0;
                }

                let valToSet = val - borderAndPad;
                this.css(horiz ? 'width' : 'height', valToSet);
            }

            return this;
        },
        width: function (val) {
            return this.height(val, { horiz: 1 });
        },
        hide: function () {
            loop(this.nodes, n => hide(n));

            return this;
        },
        show: function () {
            loop(this.nodes, n => show(n));

            return reflow(this);
        },
        fadeOut: function (duration = 400, callback) {
            loop(this.nodes, n => {
                n.style.transition = `opacity ${duration}ms`;
                n.style.opacity = 0;
                setTimeout(() => {
                    hide(n);
                    if (callback) { callback.call(n); }
                }, duration);
            });

            return this;
        },
        scrollTop: function (val, { left } = {}) {
            //const wprop = left ? 'scrollX' : 'scrollY';
            const prop = left ? 'scrollLeft' : 'scrollTop';
            function getNodeAndProp(f) {
                if (f == document || f == window) return [document.documentElement, prop];
                //if (f == window) return [f, wprop];
                return [f, prop];
            }

            if (isUndef(val)) {
                const f = firstNode(this);
                if (f) {
                    const [node, prop] = getNodeAndProp(f);
                    return node[prop];
                }
            }
            else {
                loop(this.nodes, n => {
                    const [node, prop] = getNodeAndProp(n);
                    node[prop] = val;

                    //if (n === window) {
                    //    n.scrollTo(window[wprop], val);
                    //}
                    //else {
                    //    n[prop] = val;
                    //}
                });

                return this;
            }
        },
        scrollLeft: function (val) {
            return this.scrollTop(val, { left: 1 });
        },
        position: function () {
            const elm = firstNode(this);
            const rect = elm.getBoundingClientRect();
            const ofsPrnt = elm.offsetParent;

            if (!ofsPrnt) {
                return { left: rect.left, top: rect.top };
            }

            const offsetParentRect = ofsPrnt.getBoundingClientRect();
            const lbordW = parseFloat(getComputedStyle(ofsPrnt).borderLeftWidth) || 0;

            return {
                top: rect.top - offsetParentRect.top + elm.offsetParent.scrollTop,
                left: rect.left - offsetParentRect.left + elm.offsetParent.scrollLeft - lbordW
            };
        },
        offset: function () {
            const elm = firstNode(this);
            const rect = elm.getBoundingClientRect();

            return {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX
            }
        },
        remove: function () {
            loop(this.nodes, n => remNode(n));
            return this;
        },
        detach: function () {
            loop(this.nodes, n => remNode(n, 1));
            return this;
        },
        is: function (arg) {
            if (isStr(arg)) {
                return this.nodes?.some(n => isSelector(n, arg));
            } else if (isAquery(arg)) {
                return this.nodes?.some(n => arg.nodes.includes(n))
            } else {
                return this.nodes?.some(n => arg === n);
            }

            return;
        },
        addClass: function (name) {
            loop(this.nodes, n => addClasses(n, name));
            return this;
        },
        removeClass: function (name) {
            loop(this.nodes, n => remClasses(n, name));
            return this;
        },
        toggleClass: function (cssClasses) {
            loop(this.nodes, n => toggleClasses(n, cssClasses));
            return this;
        },
        hasClass: function (name) {
            return this.nodes?.some(n => n.classList?.contains(name));
        },
        on: function (events, filter, handler, opt) {
            let [eventsArrPrm, filterPrm, handlerPrm] = getEvParam(events, filter, handler);
            filterPrm = simpleSelectorParse(filterPrm);

            loop(this.nodes, node => {
                eventsArrPrm.forEach(function ([ev, ns]) {
                    let aweEvs = node.aweEvs || {};
                    let evBindings = aweEvs[ev];

                    if (isNull(evBindings)) {
                        node.addEventListener(ev, wrapHandler);
                        aweEvs[ev] = evBindings = new Set();
                    }

                    evBindings.add({ filter: filterPrm, handler: handlerPrm, ns, one: opt?.one });
                    node.aweEvs = aweEvs;
                });
            });

            return this;
        },
        one: function (events, filter, handler) {
            return this.on(events, filter, handler, { one: 1 });
        },
        off: function (events, filter, handler) {
            let [eventsArrPrm, filterPrm, handlerPrm] = getEvParam(events, filter, handler);
            filterPrm = simpleSelectorParse(filterPrm);

            function match(b, flt1, handler1, ns) {
                let res = 1;

                if (flt1) {
                    res = res && flt1 === b.filter;
                }

                if (handler1) {
                    res = res && handler1 === b.handler;
                }

                if (ns) {
                    res = res && ns === b.ns;
                }

                return res;
            }

            loop(this.nodes, node => {
                for (const [evType, ns] of eventsArrPrm) {
                    const aweEvs = node.aweEvs || {};
                    const bindings = aweEvs[evType];

                    if (!bindings) continue;

                    let toRemove = Array.from(bindings).filter(b => match(b, filterPrm, handlerPrm, ns));

                    if (len(toRemove)) {
                        toRemove.forEach(b => bindings.delete(b));
                    }

                    if (!bindings.size) {
                        node.removeEventListener(evType, wrapHandler);
                        aweEvs[evType] = null;
                    }
                }
            });

            return this;
        },
        setNodes: function (arg) {

            let nodes = this.nodes;

            if (arg === window || arg === document) {
                nodes = [arg]
            }
            else if (arg instanceof NodeList || arg instanceof Array) {
                nodes = [...arg]
            }
            else if (arg instanceof Node) {
                nodes = [arg];
            }
            else if (isAquery(arg)) {
                nodes = arg.nodes;
            }
            else if (isStr(arg)) {
                nodes = customSelector([document], arg);
            }
            else {
                nodes = null;
            }

            this.nodes = nodes;

            recalcAqArr(this);

            return this;
        },
        add: function (arg) {
            if (isAquery(arg)) {
                const nodes = new Set(this.nodes);
                arg.nodes.forEach(n => nodes.add(n));
                this.nodes = [...nodes];
                recalcAqArr(this);
            }

            return this;
        },
        not: function (arg) {
            let toRemoveNodes;
            if (isStr(arg)) {
                toRemoveNodes = customSelector(this.nodes, arg, { useFilter: 1 });
            }
            else {
                toRemoveNodes = Array.from(arg);
            }

            return aquery(this.nodes.filter(n => !toRemoveNodes.includes(n)));
        },
        clone: function () {
            return aquery(select(this.nodes, n => n.cloneNode(true)));
        },
        append: function (arg) {
            //const f = firstNode(this);

            function add(node, prm) {
                if (Array.isArray(prm)) {
                    loop(prm, itm => add(node, itm));
                }
                else if (isAquery(prm)) {
                    loop(prm.nodes, n => node.appendChild(n));
                }
                else if (prm instanceof Node) {
                    node.appendChild(prm);
                }
                else {
                    appendFragment(node, prm);
                }
            }

            loop(this.nodes, n => add(n, arg));

            return reflow(this);
        },
        appendTo: function (arg) {
            aquery(arg).append(this);
            return this;
        },
        prependTo: function (arg) {
            aquery(arg).prepend(this);
            return this;
        },
        prepend: function (arg) {
            loop(this.nodes, n => {
                if (isStr(arg)) {
                    n.insertAdjacentHTML('afterbegin', arg);
                }
                else if (isAquery(arg)) {
                    n.prepend(arg.nodes[0]);
                }
            });

            return this;
        },
        before: function (arg) {

            function add(n, prmToAdd) {
                if (Array.isArray(prmToAdd)) {
                    loop(prmToAdd, itm => add(n, itm));
                }
                else if (isAquery(prmToAdd)) {
                    loop(prmToAdd.nodes, node => add(n, node));
                }
                else if (prmToAdd instanceof Node) {
                    //applyScriptsForNode(prmToAdd);
                    n.parentNode.insertBefore(prmToAdd, n);
                }
                else if (isStr(prmToAdd)) {
                    appendFragment(n, prmToAdd, { before: 1 })
                }
                else {
                    // int, other
                    appendFragment(n, String(prmToAdd), { before: 1 })
                }
            }

            loop(this.nodes, n => add(n, arg));

            return this;
        },
        after: function (arg) {
            const f = firstNode(this);
            if (f) {
                if (isStr(arg)) {
                    f.insertAdjacentHTML('afterend', arg);
                }
                else if (isAquery(arg)) {
                    const next = f.nextElementSibling;
                    if (next) {
                        next.parentNode.insertBefore(arg.nodes[0], next);
                    } else {
                        f.parentNode?.appendChild(arg.nodes[0]);
                    }
                }
            }

            return this;
        },
        html: function (arg) {
            const f = firstNode(this);
            if (f && !len(arguments)) {
                return f.innerHTML;
            }
            else {
                loop(this.nodes, n => {
                    if (!isObject(arg)) {
                        setHTMLWithScripts(n, arg);
                    }
                    else {
                        aquery(n).append(arg);
                    }
                });

                return this;
            }
        },
        focus: function () {
            const f = firstNode(this);
            if (f && f.focus) {
                f.focus();
            }
            return this;
        },
        empty: function () {
            loop(this.nodes, n => n.innerHTML = '')
            return this;
        },
        val: function (arg) {
            if (len(arguments)) {
                arg = isNull(arg) ? '' : arg;

                loop(this.nodes, n => {
                    n.value = arg;
                });

                return this;
            }

            const f = firstNode(this);
            return f?.value;
        },
        prop: function (name, val) {
            const f = firstNode(this);
            if (name == 'class') {
                name = 'className';
            }

            if (f && len(arguments) == 1) {
                return f[name];
            }

            loop(this.nodes, n => {
                n[name] = val;
            });

            return this;
        },
        trigger: function (name, data) {
            loop(this.nodes, n => trigger(n, name, data));
            return this;
        },
        serializeArray: function () {
            let res = [];
            let inputs = new Set();

            loop(this.nodes, n => {
                if (isForm(n)) {
                    [...n.elements].forEach(c => inputs.add(c));
                }
                else {
                    inputs.add(n);
                }
            });

            loop([...inputs], serializeInput);

            function serializeInput(n) {
                let name = attr(n, 'name');
                if (!n.disabled && name && (!['checkbox', 'radio'].includes(n.type) || n.checked)) {
                    res.push({ name: name, value: n.value });
                }
            }

            return res;
        },
        index: function (arg) {
            const f = firstNode(this);
            if (f) {
                if (arg) {
                    // element or aquery
                    if (isAquery(arg)) {
                        arg = firstNode(arg);
                    }

                    return Array.prototype.indexOf.call(this.nodes, arg);
                }

                if (!f.parentNode) {
                    return Array.prototype.indexOf.call(this.nodes, f);
                }

                return Array.prototype.indexOf.call(f.parentNode.children, f);
            }
        },
        eq: function (i) {
            if (len(this.nodes) > i) {
                return aquery(this.nodes[i]);
            }

            return aquery();
        },
        prev: function () {
            const f = firstNode(this);
            if (f) {
                return aquery(f.previousElementSibling);
            }
            return this;
        },
        next: function () {
            const f = firstNode(this);
            if (f) {
                return aquery(f.nextElementSibling);
            }
            return this;
        },
        parent: function () {
            const f = firstNode(this);
            if (f) {
                return aquery(f.parentNode);
            }

            return null;
        },
        nextAll: function (selector, { prev } = {}) {
            let res = new Set();
            let prop = prev ? 'previousElementSibling' : 'nextElementSibling';

            loop(this.nodes, n => {
                let next = n[prop];

                while (next) {
                    res.add(next);
                    next = next[prop];
                }
            });

            res = Array.from(res);

            if (selector) {
                res = res.filter(sibling => sibling.matches(selector));
            }

            return aquery(res);
        },
        prevAll: function (selector) {
            return this.nextAll(selector, { prev: 1 });
        },
        map: function (func) {
            this.setNodes(select(this.nodes, (n, i) => func.call(n, i, n)));
            return this;
        },
        bind: function (event, handler) {
            return this.on(event, handler);
        }
    };

    aquery.fn.init.prototype = aquery.fn;

    ['click', 'change', 'keydown', 'keyup', 'mousedown', 'mouseup', 'submit', 'dblclick'].forEach(type => aquery.fn[type] = getEventFunc(type));

    function getEventFunc(name) {
        return function (handler) {
            if (!len(arguments)) {
                return this.trigger(name);
            }

            return this.on(name, handler);
        }
    }

    function isNull(val) {
        return val === undefined || val === null;
    }

    function isBool(val) {
        return val === true || val === false;
    }

    function loop(arr, f) {
        if (arr) {
            for (let i = 0, ln = len(arr); i < ln; i++) {
                let col = arr[i];
                if (f(col, i) === false) {
                    break;
                };
            }
        }
    }

    function select(list, func) {
        let res = [];
        loop(list, function (el, i) {
            res.push(func(el, i));
        });

        return res;
    }

    function len(o) {
        return !o ? 0 : o.length;
    }

    function isNullOrEmp(val) {
        return isNull(val) || len(val.toString()) === 0;
    }

    function replaceAll(str, search, replacement) {
        return str.split(search).join(replacement ?? '');
    }

    function trigger(elm, ename, data) {
        if (len(elm) && elm?.tagName !== 'FORM') {
            elm = elm[0];
        }

        if (elm) {
            const ev = typeof ename === 'object' ? ename : aq.Event(ename);

            ev.aweData = data;
            elm.dispatchEvent(ev);

            if (!ev.defaultPrevented) {
                if (ename === 'focus') {
                    elm.focus && elm.focus();
                }

                if (ename === 'submit') {
                    elm.submit && elm.submit();
                }
            }
        }
    }

    function serlObj(jobj) {
        let res = [];

        for (let key in jobj) {
            if (!Array.isArray(jobj[key]))
                res.push({ name: key, value: jobj[key] });
            else res = res.concat(awef.serlArr(jobj[key], key));
        }

        return res;
    }

    function isVisible(element) {
        if (!element || !element.isConnected) return false;

        let current = element;
        while (current) {
            const style = window.getComputedStyle(current);
            if (style.display === 'none') return false;
            current = current.parentElement;
        }

        return true;
    }

    function addAttrValQuotes(str) {
        return str.replace(/\[([^=]+)=(['"]?)([^\]]*?)\2\]/g, (match, attr, quote, val) => {
            if (!quote) { // Only add quotes if they are not already present
                return `[${attr}="${val}"]`;
            }

            return match; // Return the original match if quotes are already present
        });
    }

    function hide(n) {
        let d = n.style.display;
        if (d == 'none') return;
        displayWeakMap.set(n, d);
        n.style.display = 'none';
    }

    function show(n) {
        let dval = displayWeakMap.get(n) || '';
        n.style.display = dval;

        let styles = getComputedStyle(n);

        if (styles.display === 'none') {
            const tagVisMap = {
                TR: 'table-row'
            };

            dval = tagVisMap[n.tagName] || 'block';

            n.style.display = dval;
        }
    }

    // won't split by commas inside [,]
    function splitSelectorByCommas(selector) {
        const parts = [];
        let currentPart = "";
        let inAttributeSelector = false;

        for (let i = 0; i < selector.length; i++) {
            const char = selector[i];

            if (char === "[") {
                inAttributeSelector = true;
            } else if (char === "]") {
                inAttributeSelector = false;
            } else if (char === "," && !inAttributeSelector) {
                parts.push(currentPart.trim());
                currentPart = "";
                continue; // Skip the comma
            }

            currentPart += char;
        }

        currentPart.trim() && parts.push(currentPart.trim()); // Add the last part

        return parts;
    }

    function customSelector(startNodes, selector, { useFilter } = {}) {
        const regex = /(:hidden|:visible|:eq\(\d+\)|:first|:last|:input)/;
        if (isNullOrEmp(selector) || !startNodes) return startNodes;

        // escape id starting with number (not allowed in querySelectorAll)
        if (/^#[0-9]/.test(selector)) {
            selector = `#${CSS.escape(selector.substring(1))}`;
        }

        // :checkbox :radio
        selector = simpleSelectorParse(selector);

        if (!regex.test(selector)) {
            return query(startNodes, selector);
        }

        function query(nodes, sel, mustUseFilter) {
            return useFilter || mustUseFilter ? nodes.filter(n => n.matches(sel)) :
                nodes.flatMap(n => Array.from(n.querySelectorAll(sel)));
        }

        const results = new Set();
        const byCommaParts = splitSelectorByCommas(selector).filter(Boolean);

        for (const commaPart of byCommaParts) {
            let cnodes = startNodes;

            const bySpaceParts = commaPart.split(' ').filter(Boolean);

            for (const spacePart of bySpaceParts) {
                const keywparts = spacePart.trim().split(regex).filter(Boolean).map(s => s.trim()).filter(Boolean);

                keywparts.forEach((wpart, index) => {
                    let nlen = len(cnodes);

                    if (!nlen) return false;
                    if (wpart === ":visible") {
                        cnodes = cnodes.filter(isVisible);
                    }
                    else if (wpart === ":hidden") {
                        cnodes = cnodes.filter(n => !isVisible(n));
                    }
                    else if (wpart.startsWith(":eq(")) {
                        const i = parseInt(wpart.slice(4, -1));
                        if (i >= 0 && i < nlen) {
                            cnodes = [cnodes[i]];
                        } else {
                            cnodes = [];
                        }
                    } else if (wpart === ":first") {
                        cnodes = nlen > 0 ? [cnodes[0]] : [];
                    } else if (wpart === ":last") {
                        cnodes = nlen > 0 ? [cnodes[nlen - 1]] : [];
                    }
                    else if (wpart === ":input") {
                        cnodes = query(cnodes, 'input, select, textarea, button');
                    }
                    else {
                        cnodes = query(cnodes, wpart, !!index); // use filter after i = 0
                    }
                });

                // rem duplicates
                // cnodes.forEach(node => results.add(node));
            }

            // rem duplicates
            cnodes.forEach(node => results.add(node));
        }

        let res = Array.from(results);

        if (!useFilter) {
            res = res.sort((a, b) => {
                if (a === b) return 0;
                if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING) {
                    return 1;
                }
                return -1;
            });
        }

        return res;
    }

    function setHTMLWithScripts(node, html) {
        node.innerHTML = html;
        applyScriptsForNode(node);
    }

    function strToNode(arg) {
        const tempContainer = document.createElement(arg.startsWith('<tr') ? 'tbody' : 'div');
        tempContainer.innerHTML = arg;
        return [...tempContainer.childNodes];
    }

    function appendFragment(node, arg, { before } = {}) {
        if (!node) return;
        let isTr;

        if (isStr(arg) && arg.trim().startsWith('<tr')) {
            isTr = 1;
            arg = `<table><tbody>${arg}</tbody></table>`;
        }

        const range = document.createRange();
        range.selectNode(document.body);
        const frg = range.createContextualFragment(arg);

        if (!isTr) {
            if (before) {
                node.parentNode.insertBefore(frg, node);
            }
            else {
                node.appendChild(frg);
            }

            //applyScriptsForNode(frg);
        }
        else {
            const rows = Array.from(frg.childNodes[0].childNodes[0].childNodes);

            if (before) {
                loop(rows, newNode => node.parentNode.insertBefore(newNode, node));
            }
            else {
                loop(rows, r => node.appendChild(r));
            }

            //loop(rows, applyScriptsForNode);
        }

        // appendChild and insertBefore executes present scripts
    }

    function applyScriptsForNode(node) {
        const scripts = node.querySelectorAll('script');
        scripts.forEach((script) => {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;

            Array.from(script.attributes).forEach(attr => { newScript.setAttribute(attr.name, attr.value); });

            script.parentNode.replaceChild(newScript, script);
        });
    }

    function simpleSelectorParse(sel) {
        if (!sel) return sel;
        let res = replaceAll(sel, ':checkbox', '[type="checkbox"]');
        res = replaceAll(res, ':radio', '[type="radio"]');
        res = addAttrValQuotes(res);
        return res;
    }

    function getEvParam(events, filter, handler) {
        const eventsArr = events.split(' ')
            .filter(Boolean)
            .map(evname => {
                let parts = evname.split('.');
                return [parts[0], parts.slice(1).join('.')];
            });

        if (isFunc(filter)) {
            handler = filter;
            filter = null;
        }

        return [eventsArr, filter, handler];
    }

    function firstNode(aqObj) {
        if (len(aqObj?.nodes)) {
            return aqObj.nodes[0];
        }
    }

    function attr(elm, name, val) {
        if (elm == window || elm == document) return;
        if (isUndef(val)) {
            return elm.getAttribute(name);
        }
        else {
            return elm.setAttribute(name, val);
        }
    }

    function isPlainObject(obj) {
        if (!isObject(obj)) return false;

        const proto = Object.getPrototypeOf(obj);
        return isNull(proto) || proto === Object.prototype;
    }

    function extend() {
        let target = arguments[0] || {};

        // Handle case when target is a string or something (possible in deep copy)
        if (!isObject(target) && !isFunc(target)) {
            target = {};
        }

        for (let i = 1; i < len(arguments); i++) {
            let options = arguments[i];

            // Only deal with non-null/undefined values
            if (options != null) {

                // Extend the base object
                for (let name in options) {
                    let src = target[name];
                    let copy = options[name];

                    // Prevent never-ending loop
                    if (target === copy) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if (copy && (isPlainObject(copy) || Array.isArray(copy))) {

                        let clone = src && (isPlainObject(src) || Array.isArray(src)) ? src : Array.isArray(copy) ? [] : {};

                        // Never move original objects, clone them
                        target[name] = extend(clone, copy);

                        // Don't bring in undefined values
                    } else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }

        // Return the modified object
        return target;
    }

    function isForm(element) {
        return element && (element.nodeName === 'FORM' || element.tagName === 'FORM');
    }

    function getTopMostParent(elm) {
        if (elm.parentNode) return getTopMostParent(elm.parentNode);
        return elm;
    }

    // get padding for element
    // horiz - horizontal padding/border widths
    // content - include content
    // outer = (1 - outerHeight 2 - outerHeight(true) )
    // bord - include border size
    function getDimForElm(node, { horiz, bord, content, outer } = {}) {
        let dimres = 0;

        function stylesCalc(elm) {
            const horizf = name => name.replace('Top', 'Left').replace('Bottom', 'Right');

            let mprop = 'height';
            let names = ['paddingTop', 'paddingBottom'];
            let bordNames = ['borderTopWidth', 'borderBottomWidth'];
            let margins = ['marginTop', 'marginBottom'];

            if (horiz) {
                mprop = 'width';
                names = names.map(horizf);
                margins = margins.map(horizf);
            }

            const styles = getComputedStyle(elm);

            const nParseFloat = (sval) => {
                let res = parseFloat(sval);

                // when width = 'auto'
                if (isNaN(res)) {
                    res = 0;
                }

                return res;
            };

            const sumStyles = snames => snames.reduce((prev, curr) => nParseFloat(styles[curr]) + prev, 0)

            if (outer) {
                let res = nParseFloat(styles[mprop]);

                if (outer == 2) {
                    res += sumStyles(margins);
                }

                // outerHeight/Width
                return res;
            }

            // add border width
            if (bord) {
                names = [...names, ...bordNames];
            }

            // padding + border
            let res = sumStyles(names);

            if (styles.boxSizing == 'border-box') {
                res = -res;
            }

            // content height/width
            if (content) {
                return parseFloat(styles[mprop]) + res;
            }

            return res;
        }

        let parent = getTopMostParent(node);

        if (parent != document) {
            // calling getComputedStyle(f) while f is not in document would break css transitions on f
            const tempParent = document.createElement("div");
            tempParent.style.cssText = "position: absolute; visibility: hidden; display: block;"; // Hide it from view

            document.body.appendChild(tempParent); // Temporarily append

            tempParent.appendChild(parent);

            dimres = stylesCalc(node);

            tempParent.parentNode.removeChild(tempParent); // Remove it
        }
        else {
            dimres = stylesCalc(node);
        }

        return dimres;
    }

    function wrapHandler(event) {
        let data = event?.aweData;
        data = Array.isArray(data) ? data : [data];

        const type = event.type;
        let bindings = Array.from(this.aweEvs[type]);

        if (event.namespace) {
            bindings = bindings.filter(b => b.ns == event.namespace);
        }

        // order bindings based on target and filter
        const rankedBindings = bindings
            .reduce((acc, b) => {
                if (b.filter) {
                    let res = closestRanked(event.target, b.filter);
                    res && acc.push({ b: b, node: res[0], rank: res[1] });
                }
                return acc;
            }, [])
            .sort((x, y) => x.rank - y.rank)
            .concat(
                bindings
                    .filter(b => !b.filter)
                    .map(b => ({ b }))
            );

        let immediatePropagationStopped = false;
        const orig = event.stopImmediatePropagation;
        if (orig) {
            event.stopImmediatePropagation = function () {
                immediatePropagationStopped = true;
                orig.call(event);
            };
        }

        event.originalEvent = event;

        for (const rb of rankedBindings) {
            const res = rb.b.handler.call(rb.node || this, event, ...data);

            if (rb.b.one) {
                this.aweEvs[type].delete(rb.b);
            }

            if (immediatePropagationStopped || res === false) {
                if (res === false) {
                    event.stopPropagation();
                }

                break;
            }
        }
    }
}(window.jQuery));