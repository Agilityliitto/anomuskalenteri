
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function fix_and_outro_and_destroy_block(block, lookup) {
        block.f();
        outro_and_destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.30.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function toInteger(dirtyNumber) {
      if (dirtyNumber === null || dirtyNumber === true || dirtyNumber === false) {
        return NaN;
      }

      var number = Number(dirtyNumber);

      if (isNaN(number)) {
        return number;
      }

      return number < 0 ? Math.ceil(number) : Math.floor(number);
    }

    function requiredArgs(required, args) {
      if (args.length < required) {
        throw new TypeError(required + ' argument' + (required > 1 ? 's' : '') + ' required, but only ' + args.length + ' present');
      }
    }

    /**
     * @name toDate
     * @category Common Helpers
     * @summary Convert the given argument to an instance of Date.
     *
     * @description
     * Convert the given argument to an instance of Date.
     *
     * If the argument is an instance of Date, the function returns its clone.
     *
     * If the argument is a number, it is treated as a timestamp.
     *
     * If the argument is none of the above, the function returns Invalid Date.
     *
     * **Note**: *all* Date arguments passed to any *date-fns* function is processed by `toDate`.
     *
     * @param {Date|Number} argument - the value to convert
     * @returns {Date} the parsed date in the local time zone
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // Clone the date:
     * const result = toDate(new Date(2014, 1, 11, 11, 30, 30))
     * //=> Tue Feb 11 2014 11:30:30
     *
     * @example
     * // Convert the timestamp to date:
     * const result = toDate(1392098430000)
     * //=> Tue Feb 11 2014 11:30:30
     */

    function toDate(argument) {
      requiredArgs(1, arguments);
      var argStr = Object.prototype.toString.call(argument); // Clone the date

      if (argument instanceof Date || typeof argument === 'object' && argStr === '[object Date]') {
        // Prevent the date to lose the milliseconds when passed to new Date() in IE10
        return new Date(argument.getTime());
      } else if (typeof argument === 'number' || argStr === '[object Number]') {
        return new Date(argument);
      } else {
        if ((typeof argument === 'string' || argStr === '[object String]') && typeof console !== 'undefined') {
          // eslint-disable-next-line no-console
          console.warn("Starting with v2.0.0-beta.1 date-fns doesn't accept strings as date arguments. Please use `parseISO` to parse strings. See: https://git.io/fjule"); // eslint-disable-next-line no-console

          console.warn(new Error().stack);
        }

        return new Date(NaN);
      }
    }

    /**
     * @name addMonths
     * @category Month Helpers
     * @summary Add the specified number of months to the given date.
     *
     * @description
     * Add the specified number of months to the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} amount - the amount of months to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
     * @returns {Date} the new date with the months added
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Add 5 months to 1 September 2014:
     * var result = addMonths(new Date(2014, 8, 1), 5)
     * //=> Sun Feb 01 2015 00:00:00
     */

    function addMonths(dirtyDate, dirtyAmount) {
      requiredArgs(2, arguments);
      var date = toDate(dirtyDate);
      var amount = toInteger(dirtyAmount);

      if (isNaN(amount)) {
        return new Date(NaN);
      }

      if (!amount) {
        // If 0 months, no-op to avoid changing times in the hour before end of DST
        return date;
      }

      var dayOfMonth = date.getDate(); // The JS Date object supports date math by accepting out-of-bounds values for
      // month, day, etc. For example, new Date(2020, 1, 0) returns 31 Dec 2019 and
      // new Date(2020, 13, 1) returns 1 Feb 2021.  This is *almost* the behavior we
      // want except that dates will wrap around the end of a month, meaning that
      // new Date(2020, 13, 31) will return 3 Mar 2021 not 28 Feb 2021 as desired. So
      // we'll default to the end of the desired month by adding 1 to the desired
      // month and using a date of 0 to back up one day to the end of the desired
      // month.

      var endOfDesiredMonth = new Date(date.getTime());
      endOfDesiredMonth.setMonth(date.getMonth() + amount + 1, 0);
      var daysInMonth = endOfDesiredMonth.getDate();

      if (dayOfMonth >= daysInMonth) {
        // If we're already at the end of the month, then this is the correct date
        // and we're done.
        return endOfDesiredMonth;
      } else {
        // Otherwise, we now know that setting the original day-of-month value won't
        // cause an overflow, so set the desired day-of-month. Note that we can't
        // just set the date of `endOfDesiredMonth` because that object may have had
        // its time changed in the unusual case where where a DST transition was on
        // the last day of the month and its local time was in the hour skipped or
        // repeated next to a DST transition.  So we use `date` instead which is
        // guaranteed to still have the original time.
        date.setFullYear(endOfDesiredMonth.getFullYear(), endOfDesiredMonth.getMonth(), dayOfMonth);
        return date;
      }
    }

    /**
     * @name addMilliseconds
     * @category Millisecond Helpers
     * @summary Add the specified number of milliseconds to the given date.
     *
     * @description
     * Add the specified number of milliseconds to the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} amount - the amount of milliseconds to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
     * @returns {Date} the new date with the milliseconds added
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Add 750 milliseconds to 10 July 2014 12:45:30.000:
     * var result = addMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
     * //=> Thu Jul 10 2014 12:45:30.750
     */

    function addMilliseconds(dirtyDate, dirtyAmount) {
      requiredArgs(2, arguments);
      var timestamp = toDate(dirtyDate).getTime();
      var amount = toInteger(dirtyAmount);
      return new Date(timestamp + amount);
    }

    var MILLISECONDS_IN_MINUTE = 60000;

    function getDateMillisecondsPart(date) {
      return date.getTime() % MILLISECONDS_IN_MINUTE;
    }
    /**
     * Google Chrome as of 67.0.3396.87 introduced timezones with offset that includes seconds.
     * They usually appear for dates that denote time before the timezones were introduced
     * (e.g. for 'Europe/Prague' timezone the offset is GMT+00:57:44 before 1 October 1891
     * and GMT+01:00:00 after that date)
     *
     * Date#getTimezoneOffset returns the offset in minutes and would return 57 for the example above,
     * which would lead to incorrect calculations.
     *
     * This function returns the timezone offset in milliseconds that takes seconds in account.
     */


    function getTimezoneOffsetInMilliseconds(dirtyDate) {
      var date = new Date(dirtyDate.getTime());
      var baseTimezoneOffset = Math.ceil(date.getTimezoneOffset());
      date.setSeconds(0, 0);
      var hasNegativeUTCOffset = baseTimezoneOffset > 0;
      var millisecondsPartOfTimezoneOffset = hasNegativeUTCOffset ? (MILLISECONDS_IN_MINUTE + getDateMillisecondsPart(date)) % MILLISECONDS_IN_MINUTE : getDateMillisecondsPart(date);
      return baseTimezoneOffset * MILLISECONDS_IN_MINUTE + millisecondsPartOfTimezoneOffset;
    }

    /**
     * @name isValid
     * @category Common Helpers
     * @summary Is the given date valid?
     *
     * @description
     * Returns false if argument is Invalid Date and true otherwise.
     * Argument is converted to Date using `toDate`. See [toDate]{@link https://date-fns.org/docs/toDate}
     * Invalid Date is a Date, whose time value is NaN.
     *
     * Time value of Date: http://es5.github.io/#x15.9.1.1
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * - Now `isValid` doesn't throw an exception
     *   if the first argument is not an instance of Date.
     *   Instead, argument is converted beforehand using `toDate`.
     *
     *   Examples:
     *
     *   | `isValid` argument        | Before v2.0.0 | v2.0.0 onward |
     *   |---------------------------|---------------|---------------|
     *   | `new Date()`              | `true`        | `true`        |
     *   | `new Date('2016-01-01')`  | `true`        | `true`        |
     *   | `new Date('')`            | `false`       | `false`       |
     *   | `new Date(1488370835081)` | `true`        | `true`        |
     *   | `new Date(NaN)`           | `false`       | `false`       |
     *   | `'2016-01-01'`            | `TypeError`   | `false`       |
     *   | `''`                      | `TypeError`   | `false`       |
     *   | `1488370835081`           | `TypeError`   | `true`        |
     *   | `NaN`                     | `TypeError`   | `false`       |
     *
     *   We introduce this change to make *date-fns* consistent with ECMAScript behavior
     *   that try to coerce arguments to the expected type
     *   (which is also the case with other *date-fns* functions).
     *
     * @param {*} date - the date to check
     * @returns {Boolean} the date is valid
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // For the valid date:
     * var result = isValid(new Date(2014, 1, 31))
     * //=> true
     *
     * @example
     * // For the value, convertable into a date:
     * var result = isValid(1393804800000)
     * //=> true
     *
     * @example
     * // For the invalid date:
     * var result = isValid(new Date(''))
     * //=> false
     */

    function isValid(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      return !isNaN(date);
    }

    /**
     * @name eachMonthOfInterval
     * @category Interval Helpers
     * @summary Return the array of months within the specified time interval.
     *
     * @description
     * Return the array of months within the specified time interval.
     *
     * @param {Interval} interval - the interval. See [Interval]{@link docs/types/Interval}
     * @returns {Date[]} the array with starts of months from the month of the interval start to the month of the interval end
     * @throws {TypeError} 1 argument required
     * @throws {RangeError} The start of an interval cannot be after its end
     * @throws {RangeError} Date in interval cannot be `Invalid Date`
     *
     * @example
     * // Each month between 6 February 2014 and 10 August 2014:
     * var result = eachMonthOfInterval({
     *   start: new Date(2014, 1, 6),
     *   end: new Date(2014, 7, 10)
     * })
     * //=> [
     * //   Sat Feb 01 2014 00:00:00,
     * //   Sat Mar 01 2014 00:00:00,
     * //   Tue Apr 01 2014 00:00:00,
     * //   Thu May 01 2014 00:00:00,
     * //   Sun Jun 01 2014 00:00:00,
     * //   Tue Jul 01 2014 00:00:00,
     * //   Fri Aug 01 2014 00:00:00
     * // ]
     */

    function eachMonthOfInterval(dirtyInterval) {
      requiredArgs(1, arguments);
      var interval = dirtyInterval || {};
      var startDate = toDate(interval.start);
      var endDate = toDate(interval.end);
      var endTime = endDate.getTime(); // Throw an exception if start date is after end date or if any date is `Invalid Date`

      if (!(startDate.getTime() <= endTime)) {
        throw new RangeError('Invalid interval');
      }

      var dates = [];
      var currentDate = startDate;
      currentDate.setHours(0, 0, 0, 0);
      currentDate.setDate(1);

      while (currentDate.getTime() <= endTime) {
        dates.push(toDate(currentDate));
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      return dates;
    }

    var formatDistanceLocale = {
      lessThanXSeconds: {
        one: 'less than a second',
        other: 'less than {{count}} seconds'
      },
      xSeconds: {
        one: '1 second',
        other: '{{count}} seconds'
      },
      halfAMinute: 'half a minute',
      lessThanXMinutes: {
        one: 'less than a minute',
        other: 'less than {{count}} minutes'
      },
      xMinutes: {
        one: '1 minute',
        other: '{{count}} minutes'
      },
      aboutXHours: {
        one: 'about 1 hour',
        other: 'about {{count}} hours'
      },
      xHours: {
        one: '1 hour',
        other: '{{count}} hours'
      },
      xDays: {
        one: '1 day',
        other: '{{count}} days'
      },
      aboutXWeeks: {
        one: 'about 1 week',
        other: 'about {{count}} weeks'
      },
      xWeeks: {
        one: '1 week',
        other: '{{count}} weeks'
      },
      aboutXMonths: {
        one: 'about 1 month',
        other: 'about {{count}} months'
      },
      xMonths: {
        one: '1 month',
        other: '{{count}} months'
      },
      aboutXYears: {
        one: 'about 1 year',
        other: 'about {{count}} years'
      },
      xYears: {
        one: '1 year',
        other: '{{count}} years'
      },
      overXYears: {
        one: 'over 1 year',
        other: 'over {{count}} years'
      },
      almostXYears: {
        one: 'almost 1 year',
        other: 'almost {{count}} years'
      }
    };
    function formatDistance(token, count, options) {
      options = options || {};
      var result;

      if (typeof formatDistanceLocale[token] === 'string') {
        result = formatDistanceLocale[token];
      } else if (count === 1) {
        result = formatDistanceLocale[token].one;
      } else {
        result = formatDistanceLocale[token].other.replace('{{count}}', count);
      }

      if (options.addSuffix) {
        if (options.comparison > 0) {
          return 'in ' + result;
        } else {
          return result + ' ago';
        }
      }

      return result;
    }

    function buildFormatLongFn(args) {
      return function (dirtyOptions) {
        var options = dirtyOptions || {};
        var width = options.width ? String(options.width) : args.defaultWidth;
        var format = args.formats[width] || args.formats[args.defaultWidth];
        return format;
      };
    }

    var dateFormats = {
      full: 'EEEE, MMMM do, y',
      long: 'MMMM do, y',
      medium: 'MMM d, y',
      short: 'MM/dd/yyyy'
    };
    var timeFormats = {
      full: 'h:mm:ss a zzzz',
      long: 'h:mm:ss a z',
      medium: 'h:mm:ss a',
      short: 'h:mm a'
    };
    var dateTimeFormats = {
      full: "{{date}} 'at' {{time}}",
      long: "{{date}} 'at' {{time}}",
      medium: '{{date}}, {{time}}',
      short: '{{date}}, {{time}}'
    };
    var formatLong = {
      date: buildFormatLongFn({
        formats: dateFormats,
        defaultWidth: 'full'
      }),
      time: buildFormatLongFn({
        formats: timeFormats,
        defaultWidth: 'full'
      }),
      dateTime: buildFormatLongFn({
        formats: dateTimeFormats,
        defaultWidth: 'full'
      })
    };

    var formatRelativeLocale = {
      lastWeek: "'last' eeee 'at' p",
      yesterday: "'yesterday at' p",
      today: "'today at' p",
      tomorrow: "'tomorrow at' p",
      nextWeek: "eeee 'at' p",
      other: 'P'
    };
    function formatRelative(token, _date, _baseDate, _options) {
      return formatRelativeLocale[token];
    }

    function buildLocalizeFn(args) {
      return function (dirtyIndex, dirtyOptions) {
        var options = dirtyOptions || {};
        var context = options.context ? String(options.context) : 'standalone';
        var valuesArray;

        if (context === 'formatting' && args.formattingValues) {
          var defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
          var width = options.width ? String(options.width) : defaultWidth;
          valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
        } else {
          var _defaultWidth = args.defaultWidth;

          var _width = options.width ? String(options.width) : args.defaultWidth;

          valuesArray = args.values[_width] || args.values[_defaultWidth];
        }

        var index = args.argumentCallback ? args.argumentCallback(dirtyIndex) : dirtyIndex;
        return valuesArray[index];
      };
    }

    var eraValues = {
      narrow: ['B', 'A'],
      abbreviated: ['BC', 'AD'],
      wide: ['Before Christ', 'Anno Domini']
    };
    var quarterValues = {
      narrow: ['1', '2', '3', '4'],
      abbreviated: ['Q1', 'Q2', 'Q3', 'Q4'],
      wide: ['1st quarter', '2nd quarter', '3rd quarter', '4th quarter'] // Note: in English, the names of days of the week and months are capitalized.
      // If you are making a new locale based on this one, check if the same is true for the language you're working on.
      // Generally, formatted dates should look like they are in the middle of a sentence,
      // e.g. in Spanish language the weekdays and months should be in the lowercase.

    };
    var monthValues = {
      narrow: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
      abbreviated: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      wide: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    };
    var dayValues = {
      narrow: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
      short: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
      abbreviated: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      wide: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    };
    var dayPeriodValues = {
      narrow: {
        am: 'a',
        pm: 'p',
        midnight: 'mi',
        noon: 'n',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      },
      abbreviated: {
        am: 'AM',
        pm: 'PM',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      },
      wide: {
        am: 'a.m.',
        pm: 'p.m.',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      }
    };
    var formattingDayPeriodValues = {
      narrow: {
        am: 'a',
        pm: 'p',
        midnight: 'mi',
        noon: 'n',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      },
      abbreviated: {
        am: 'AM',
        pm: 'PM',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      },
      wide: {
        am: 'a.m.',
        pm: 'p.m.',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      }
    };

    function ordinalNumber(dirtyNumber, _dirtyOptions) {
      var number = Number(dirtyNumber); // If ordinal numbers depend on context, for example,
      // if they are different for different grammatical genders,
      // use `options.unit`:
      //
      //   var options = dirtyOptions || {}
      //   var unit = String(options.unit)
      //
      // where `unit` can be 'year', 'quarter', 'month', 'week', 'date', 'dayOfYear',
      // 'day', 'hour', 'minute', 'second'

      var rem100 = number % 100;

      if (rem100 > 20 || rem100 < 10) {
        switch (rem100 % 10) {
          case 1:
            return number + 'st';

          case 2:
            return number + 'nd';

          case 3:
            return number + 'rd';
        }
      }

      return number + 'th';
    }

    var localize = {
      ordinalNumber: ordinalNumber,
      era: buildLocalizeFn({
        values: eraValues,
        defaultWidth: 'wide'
      }),
      quarter: buildLocalizeFn({
        values: quarterValues,
        defaultWidth: 'wide',
        argumentCallback: function (quarter) {
          return Number(quarter) - 1;
        }
      }),
      month: buildLocalizeFn({
        values: monthValues,
        defaultWidth: 'wide'
      }),
      day: buildLocalizeFn({
        values: dayValues,
        defaultWidth: 'wide'
      }),
      dayPeriod: buildLocalizeFn({
        values: dayPeriodValues,
        defaultWidth: 'wide',
        formattingValues: formattingDayPeriodValues,
        defaultFormattingWidth: 'wide'
      })
    };

    function buildMatchPatternFn(args) {
      return function (dirtyString, dirtyOptions) {
        var string = String(dirtyString);
        var options = dirtyOptions || {};
        var matchResult = string.match(args.matchPattern);

        if (!matchResult) {
          return null;
        }

        var matchedString = matchResult[0];
        var parseResult = string.match(args.parsePattern);

        if (!parseResult) {
          return null;
        }

        var value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
        value = options.valueCallback ? options.valueCallback(value) : value;
        return {
          value: value,
          rest: string.slice(matchedString.length)
        };
      };
    }

    function buildMatchFn(args) {
      return function (dirtyString, dirtyOptions) {
        var string = String(dirtyString);
        var options = dirtyOptions || {};
        var width = options.width;
        var matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
        var matchResult = string.match(matchPattern);

        if (!matchResult) {
          return null;
        }

        var matchedString = matchResult[0];
        var parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
        var value;

        if (Object.prototype.toString.call(parsePatterns) === '[object Array]') {
          value = findIndex(parsePatterns, function (pattern) {
            return pattern.test(matchedString);
          });
        } else {
          value = findKey(parsePatterns, function (pattern) {
            return pattern.test(matchedString);
          });
        }

        value = args.valueCallback ? args.valueCallback(value) : value;
        value = options.valueCallback ? options.valueCallback(value) : value;
        return {
          value: value,
          rest: string.slice(matchedString.length)
        };
      };
    }

    function findKey(object, predicate) {
      for (var key in object) {
        if (object.hasOwnProperty(key) && predicate(object[key])) {
          return key;
        }
      }
    }

    function findIndex(array, predicate) {
      for (var key = 0; key < array.length; key++) {
        if (predicate(array[key])) {
          return key;
        }
      }
    }

    var matchOrdinalNumberPattern = /^(\d+)(th|st|nd|rd)?/i;
    var parseOrdinalNumberPattern = /\d+/i;
    var matchEraPatterns = {
      narrow: /^(b|a)/i,
      abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
      wide: /^(before christ|before common era|anno domini|common era)/i
    };
    var parseEraPatterns = {
      any: [/^b/i, /^(a|c)/i]
    };
    var matchQuarterPatterns = {
      narrow: /^[1234]/i,
      abbreviated: /^q[1234]/i,
      wide: /^[1234](th|st|nd|rd)? quarter/i
    };
    var parseQuarterPatterns = {
      any: [/1/i, /2/i, /3/i, /4/i]
    };
    var matchMonthPatterns = {
      narrow: /^[jfmasond]/i,
      abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
    };
    var parseMonthPatterns = {
      narrow: [/^j/i, /^f/i, /^m/i, /^a/i, /^m/i, /^j/i, /^j/i, /^a/i, /^s/i, /^o/i, /^n/i, /^d/i],
      any: [/^ja/i, /^f/i, /^mar/i, /^ap/i, /^may/i, /^jun/i, /^jul/i, /^au/i, /^s/i, /^o/i, /^n/i, /^d/i]
    };
    var matchDayPatterns = {
      narrow: /^[smtwf]/i,
      short: /^(su|mo|tu|we|th|fr|sa)/i,
      abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
      wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
    };
    var parseDayPatterns = {
      narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
      any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
    };
    var matchDayPeriodPatterns = {
      narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
      any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
    };
    var parseDayPeriodPatterns = {
      any: {
        am: /^a/i,
        pm: /^p/i,
        midnight: /^mi/i,
        noon: /^no/i,
        morning: /morning/i,
        afternoon: /afternoon/i,
        evening: /evening/i,
        night: /night/i
      }
    };
    var match = {
      ordinalNumber: buildMatchPatternFn({
        matchPattern: matchOrdinalNumberPattern,
        parsePattern: parseOrdinalNumberPattern,
        valueCallback: function (value) {
          return parseInt(value, 10);
        }
      }),
      era: buildMatchFn({
        matchPatterns: matchEraPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseEraPatterns,
        defaultParseWidth: 'any'
      }),
      quarter: buildMatchFn({
        matchPatterns: matchQuarterPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseQuarterPatterns,
        defaultParseWidth: 'any',
        valueCallback: function (index) {
          return index + 1;
        }
      }),
      month: buildMatchFn({
        matchPatterns: matchMonthPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseMonthPatterns,
        defaultParseWidth: 'any'
      }),
      day: buildMatchFn({
        matchPatterns: matchDayPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseDayPatterns,
        defaultParseWidth: 'any'
      }),
      dayPeriod: buildMatchFn({
        matchPatterns: matchDayPeriodPatterns,
        defaultMatchWidth: 'any',
        parsePatterns: parseDayPeriodPatterns,
        defaultParseWidth: 'any'
      })
    };

    /**
     * @type {Locale}
     * @category Locales
     * @summary English locale (United States).
     * @language English
     * @iso-639-2 eng
     * @author Sasha Koss [@kossnocorp]{@link https://github.com/kossnocorp}
     * @author Lesha Koss [@leshakoss]{@link https://github.com/leshakoss}
     */

    var locale = {
      code: 'en-US',
      formatDistance: formatDistance,
      formatLong: formatLong,
      formatRelative: formatRelative,
      localize: localize,
      match: match,
      options: {
        weekStartsOn: 0
        /* Sunday */
        ,
        firstWeekContainsDate: 1
      }
    };

    /**
     * @name subMilliseconds
     * @category Millisecond Helpers
     * @summary Subtract the specified number of milliseconds from the given date.
     *
     * @description
     * Subtract the specified number of milliseconds from the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} amount - the amount of milliseconds to be subtracted. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
     * @returns {Date} the new date with the milliseconds subtracted
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Subtract 750 milliseconds from 10 July 2014 12:45:30.000:
     * var result = subMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
     * //=> Thu Jul 10 2014 12:45:29.250
     */

    function subMilliseconds(dirtyDate, dirtyAmount) {
      requiredArgs(2, arguments);
      var amount = toInteger(dirtyAmount);
      return addMilliseconds(dirtyDate, -amount);
    }

    function addLeadingZeros(number, targetLength) {
      var sign = number < 0 ? '-' : '';
      var output = Math.abs(number).toString();

      while (output.length < targetLength) {
        output = '0' + output;
      }

      return sign + output;
    }

    /*
     * |     | Unit                           |     | Unit                           |
     * |-----|--------------------------------|-----|--------------------------------|
     * |  a  | AM, PM                         |  A* |                                |
     * |  d  | Day of month                   |  D  |                                |
     * |  h  | Hour [1-12]                    |  H  | Hour [0-23]                    |
     * |  m  | Minute                         |  M  | Month                          |
     * |  s  | Second                         |  S  | Fraction of second             |
     * |  y  | Year (abs)                     |  Y  |                                |
     *
     * Letters marked by * are not implemented but reserved by Unicode standard.
     */

    var formatters = {
      // Year
      y: function (date, token) {
        // From http://www.unicode.org/reports/tr35/tr35-31/tr35-dates.html#Date_Format_tokens
        // | Year     |     y | yy |   yyy |  yyyy | yyyyy |
        // |----------|-------|----|-------|-------|-------|
        // | AD 1     |     1 | 01 |   001 |  0001 | 00001 |
        // | AD 12    |    12 | 12 |   012 |  0012 | 00012 |
        // | AD 123   |   123 | 23 |   123 |  0123 | 00123 |
        // | AD 1234  |  1234 | 34 |  1234 |  1234 | 01234 |
        // | AD 12345 | 12345 | 45 | 12345 | 12345 | 12345 |
        var signedYear = date.getUTCFullYear(); // Returns 1 for 1 BC (which is year 0 in JavaScript)

        var year = signedYear > 0 ? signedYear : 1 - signedYear;
        return addLeadingZeros(token === 'yy' ? year % 100 : year, token.length);
      },
      // Month
      M: function (date, token) {
        var month = date.getUTCMonth();
        return token === 'M' ? String(month + 1) : addLeadingZeros(month + 1, 2);
      },
      // Day of the month
      d: function (date, token) {
        return addLeadingZeros(date.getUTCDate(), token.length);
      },
      // AM or PM
      a: function (date, token) {
        var dayPeriodEnumValue = date.getUTCHours() / 12 >= 1 ? 'pm' : 'am';

        switch (token) {
          case 'a':
          case 'aa':
          case 'aaa':
            return dayPeriodEnumValue.toUpperCase();

          case 'aaaaa':
            return dayPeriodEnumValue[0];

          case 'aaaa':
          default:
            return dayPeriodEnumValue === 'am' ? 'a.m.' : 'p.m.';
        }
      },
      // Hour [1-12]
      h: function (date, token) {
        return addLeadingZeros(date.getUTCHours() % 12 || 12, token.length);
      },
      // Hour [0-23]
      H: function (date, token) {
        return addLeadingZeros(date.getUTCHours(), token.length);
      },
      // Minute
      m: function (date, token) {
        return addLeadingZeros(date.getUTCMinutes(), token.length);
      },
      // Second
      s: function (date, token) {
        return addLeadingZeros(date.getUTCSeconds(), token.length);
      },
      // Fraction of second
      S: function (date, token) {
        var numberOfDigits = token.length;
        var milliseconds = date.getUTCMilliseconds();
        var fractionalSeconds = Math.floor(milliseconds * Math.pow(10, numberOfDigits - 3));
        return addLeadingZeros(fractionalSeconds, token.length);
      }
    };

    var MILLISECONDS_IN_DAY = 86400000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCDayOfYear(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var timestamp = date.getTime();
      date.setUTCMonth(0, 1);
      date.setUTCHours(0, 0, 0, 0);
      var startOfYearTimestamp = date.getTime();
      var difference = timestamp - startOfYearTimestamp;
      return Math.floor(difference / MILLISECONDS_IN_DAY) + 1;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCISOWeek(dirtyDate) {
      requiredArgs(1, arguments);
      var weekStartsOn = 1;
      var date = toDate(dirtyDate);
      var day = date.getUTCDay();
      var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
      date.setUTCDate(date.getUTCDate() - diff);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCISOWeekYear(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var year = date.getUTCFullYear();
      var fourthOfJanuaryOfNextYear = new Date(0);
      fourthOfJanuaryOfNextYear.setUTCFullYear(year + 1, 0, 4);
      fourthOfJanuaryOfNextYear.setUTCHours(0, 0, 0, 0);
      var startOfNextYear = startOfUTCISOWeek(fourthOfJanuaryOfNextYear);
      var fourthOfJanuaryOfThisYear = new Date(0);
      fourthOfJanuaryOfThisYear.setUTCFullYear(year, 0, 4);
      fourthOfJanuaryOfThisYear.setUTCHours(0, 0, 0, 0);
      var startOfThisYear = startOfUTCISOWeek(fourthOfJanuaryOfThisYear);

      if (date.getTime() >= startOfNextYear.getTime()) {
        return year + 1;
      } else if (date.getTime() >= startOfThisYear.getTime()) {
        return year;
      } else {
        return year - 1;
      }
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCISOWeekYear(dirtyDate) {
      requiredArgs(1, arguments);
      var year = getUTCISOWeekYear(dirtyDate);
      var fourthOfJanuary = new Date(0);
      fourthOfJanuary.setUTCFullYear(year, 0, 4);
      fourthOfJanuary.setUTCHours(0, 0, 0, 0);
      var date = startOfUTCISOWeek(fourthOfJanuary);
      return date;
    }

    var MILLISECONDS_IN_WEEK = 604800000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCISOWeek(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var diff = startOfUTCISOWeek(date).getTime() - startOfUTCISOWeekYear(date).getTime(); // Round the number of days to the nearest integer
      // because the number of milliseconds in a week is not constant
      // (e.g. it's different in the week of the daylight saving time clock shift)

      return Math.round(diff / MILLISECONDS_IN_WEEK) + 1;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCWeek(dirtyDate, dirtyOptions) {
      requiredArgs(1, arguments);
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeWeekStartsOn = locale && locale.options && locale.options.weekStartsOn;
      var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
      var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
        throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }

      var date = toDate(dirtyDate);
      var day = date.getUTCDay();
      var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
      date.setUTCDate(date.getUTCDate() - diff);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCWeekYear(dirtyDate, dirtyOptions) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate, dirtyOptions);
      var year = date.getUTCFullYear();
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeFirstWeekContainsDate = locale && locale.options && locale.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate); // Test if weekStartsOn is between 1 and 7 _and_ is not NaN

      if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
        throw new RangeError('firstWeekContainsDate must be between 1 and 7 inclusively');
      }

      var firstWeekOfNextYear = new Date(0);
      firstWeekOfNextYear.setUTCFullYear(year + 1, 0, firstWeekContainsDate);
      firstWeekOfNextYear.setUTCHours(0, 0, 0, 0);
      var startOfNextYear = startOfUTCWeek(firstWeekOfNextYear, dirtyOptions);
      var firstWeekOfThisYear = new Date(0);
      firstWeekOfThisYear.setUTCFullYear(year, 0, firstWeekContainsDate);
      firstWeekOfThisYear.setUTCHours(0, 0, 0, 0);
      var startOfThisYear = startOfUTCWeek(firstWeekOfThisYear, dirtyOptions);

      if (date.getTime() >= startOfNextYear.getTime()) {
        return year + 1;
      } else if (date.getTime() >= startOfThisYear.getTime()) {
        return year;
      } else {
        return year - 1;
      }
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCWeekYear(dirtyDate, dirtyOptions) {
      requiredArgs(1, arguments);
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeFirstWeekContainsDate = locale && locale.options && locale.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate);
      var year = getUTCWeekYear(dirtyDate, dirtyOptions);
      var firstWeek = new Date(0);
      firstWeek.setUTCFullYear(year, 0, firstWeekContainsDate);
      firstWeek.setUTCHours(0, 0, 0, 0);
      var date = startOfUTCWeek(firstWeek, dirtyOptions);
      return date;
    }

    var MILLISECONDS_IN_WEEK$1 = 604800000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCWeek(dirtyDate, options) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var diff = startOfUTCWeek(date, options).getTime() - startOfUTCWeekYear(date, options).getTime(); // Round the number of days to the nearest integer
      // because the number of milliseconds in a week is not constant
      // (e.g. it's different in the week of the daylight saving time clock shift)

      return Math.round(diff / MILLISECONDS_IN_WEEK$1) + 1;
    }

    var dayPeriodEnum = {
      am: 'am',
      pm: 'pm',
      midnight: 'midnight',
      noon: 'noon',
      morning: 'morning',
      afternoon: 'afternoon',
      evening: 'evening',
      night: 'night'
      /*
       * |     | Unit                           |     | Unit                           |
       * |-----|--------------------------------|-----|--------------------------------|
       * |  a  | AM, PM                         |  A* | Milliseconds in day            |
       * |  b  | AM, PM, noon, midnight         |  B  | Flexible day period            |
       * |  c  | Stand-alone local day of week  |  C* | Localized hour w/ day period   |
       * |  d  | Day of month                   |  D  | Day of year                    |
       * |  e  | Local day of week              |  E  | Day of week                    |
       * |  f  |                                |  F* | Day of week in month           |
       * |  g* | Modified Julian day            |  G  | Era                            |
       * |  h  | Hour [1-12]                    |  H  | Hour [0-23]                    |
       * |  i! | ISO day of week                |  I! | ISO week of year               |
       * |  j* | Localized hour w/ day period   |  J* | Localized hour w/o day period  |
       * |  k  | Hour [1-24]                    |  K  | Hour [0-11]                    |
       * |  l* | (deprecated)                   |  L  | Stand-alone month              |
       * |  m  | Minute                         |  M  | Month                          |
       * |  n  |                                |  N  |                                |
       * |  o! | Ordinal number modifier        |  O  | Timezone (GMT)                 |
       * |  p! | Long localized time            |  P! | Long localized date            |
       * |  q  | Stand-alone quarter            |  Q  | Quarter                        |
       * |  r* | Related Gregorian year         |  R! | ISO week-numbering year        |
       * |  s  | Second                         |  S  | Fraction of second             |
       * |  t! | Seconds timestamp              |  T! | Milliseconds timestamp         |
       * |  u  | Extended year                  |  U* | Cyclic year                    |
       * |  v* | Timezone (generic non-locat.)  |  V* | Timezone (location)            |
       * |  w  | Local week of year             |  W* | Week of month                  |
       * |  x  | Timezone (ISO-8601 w/o Z)      |  X  | Timezone (ISO-8601)            |
       * |  y  | Year (abs)                     |  Y  | Local week-numbering year      |
       * |  z  | Timezone (specific non-locat.) |  Z* | Timezone (aliases)             |
       *
       * Letters marked by * are not implemented but reserved by Unicode standard.
       *
       * Letters marked by ! are non-standard, but implemented by date-fns:
       * - `o` modifies the previous token to turn it into an ordinal (see `format` docs)
       * - `i` is ISO day of week. For `i` and `ii` is returns numeric ISO week days,
       *   i.e. 7 for Sunday, 1 for Monday, etc.
       * - `I` is ISO week of year, as opposed to `w` which is local week of year.
       * - `R` is ISO week-numbering year, as opposed to `Y` which is local week-numbering year.
       *   `R` is supposed to be used in conjunction with `I` and `i`
       *   for universal ISO week-numbering date, whereas
       *   `Y` is supposed to be used in conjunction with `w` and `e`
       *   for week-numbering date specific to the locale.
       * - `P` is long localized date format
       * - `p` is long localized time format
       */

    };
    var formatters$1 = {
      // Era
      G: function (date, token, localize) {
        var era = date.getUTCFullYear() > 0 ? 1 : 0;

        switch (token) {
          // AD, BC
          case 'G':
          case 'GG':
          case 'GGG':
            return localize.era(era, {
              width: 'abbreviated'
            });
          // A, B

          case 'GGGGG':
            return localize.era(era, {
              width: 'narrow'
            });
          // Anno Domini, Before Christ

          case 'GGGG':
          default:
            return localize.era(era, {
              width: 'wide'
            });
        }
      },
      // Year
      y: function (date, token, localize) {
        // Ordinal number
        if (token === 'yo') {
          var signedYear = date.getUTCFullYear(); // Returns 1 for 1 BC (which is year 0 in JavaScript)

          var year = signedYear > 0 ? signedYear : 1 - signedYear;
          return localize.ordinalNumber(year, {
            unit: 'year'
          });
        }

        return formatters.y(date, token);
      },
      // Local week-numbering year
      Y: function (date, token, localize, options) {
        var signedWeekYear = getUTCWeekYear(date, options); // Returns 1 for 1 BC (which is year 0 in JavaScript)

        var weekYear = signedWeekYear > 0 ? signedWeekYear : 1 - signedWeekYear; // Two digit year

        if (token === 'YY') {
          var twoDigitYear = weekYear % 100;
          return addLeadingZeros(twoDigitYear, 2);
        } // Ordinal number


        if (token === 'Yo') {
          return localize.ordinalNumber(weekYear, {
            unit: 'year'
          });
        } // Padding


        return addLeadingZeros(weekYear, token.length);
      },
      // ISO week-numbering year
      R: function (date, token) {
        var isoWeekYear = getUTCISOWeekYear(date); // Padding

        return addLeadingZeros(isoWeekYear, token.length);
      },
      // Extended year. This is a single number designating the year of this calendar system.
      // The main difference between `y` and `u` localizers are B.C. years:
      // | Year | `y` | `u` |
      // |------|-----|-----|
      // | AC 1 |   1 |   1 |
      // | BC 1 |   1 |   0 |
      // | BC 2 |   2 |  -1 |
      // Also `yy` always returns the last two digits of a year,
      // while `uu` pads single digit years to 2 characters and returns other years unchanged.
      u: function (date, token) {
        var year = date.getUTCFullYear();
        return addLeadingZeros(year, token.length);
      },
      // Quarter
      Q: function (date, token, localize) {
        var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);

        switch (token) {
          // 1, 2, 3, 4
          case 'Q':
            return String(quarter);
          // 01, 02, 03, 04

          case 'QQ':
            return addLeadingZeros(quarter, 2);
          // 1st, 2nd, 3rd, 4th

          case 'Qo':
            return localize.ordinalNumber(quarter, {
              unit: 'quarter'
            });
          // Q1, Q2, Q3, Q4

          case 'QQQ':
            return localize.quarter(quarter, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // 1, 2, 3, 4 (narrow quarter; could be not numerical)

          case 'QQQQQ':
            return localize.quarter(quarter, {
              width: 'narrow',
              context: 'formatting'
            });
          // 1st quarter, 2nd quarter, ...

          case 'QQQQ':
          default:
            return localize.quarter(quarter, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Stand-alone quarter
      q: function (date, token, localize) {
        var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);

        switch (token) {
          // 1, 2, 3, 4
          case 'q':
            return String(quarter);
          // 01, 02, 03, 04

          case 'qq':
            return addLeadingZeros(quarter, 2);
          // 1st, 2nd, 3rd, 4th

          case 'qo':
            return localize.ordinalNumber(quarter, {
              unit: 'quarter'
            });
          // Q1, Q2, Q3, Q4

          case 'qqq':
            return localize.quarter(quarter, {
              width: 'abbreviated',
              context: 'standalone'
            });
          // 1, 2, 3, 4 (narrow quarter; could be not numerical)

          case 'qqqqq':
            return localize.quarter(quarter, {
              width: 'narrow',
              context: 'standalone'
            });
          // 1st quarter, 2nd quarter, ...

          case 'qqqq':
          default:
            return localize.quarter(quarter, {
              width: 'wide',
              context: 'standalone'
            });
        }
      },
      // Month
      M: function (date, token, localize) {
        var month = date.getUTCMonth();

        switch (token) {
          case 'M':
          case 'MM':
            return formatters.M(date, token);
          // 1st, 2nd, ..., 12th

          case 'Mo':
            return localize.ordinalNumber(month + 1, {
              unit: 'month'
            });
          // Jan, Feb, ..., Dec

          case 'MMM':
            return localize.month(month, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // J, F, ..., D

          case 'MMMMM':
            return localize.month(month, {
              width: 'narrow',
              context: 'formatting'
            });
          // January, February, ..., December

          case 'MMMM':
          default:
            return localize.month(month, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Stand-alone month
      L: function (date, token, localize) {
        var month = date.getUTCMonth();

        switch (token) {
          // 1, 2, ..., 12
          case 'L':
            return String(month + 1);
          // 01, 02, ..., 12

          case 'LL':
            return addLeadingZeros(month + 1, 2);
          // 1st, 2nd, ..., 12th

          case 'Lo':
            return localize.ordinalNumber(month + 1, {
              unit: 'month'
            });
          // Jan, Feb, ..., Dec

          case 'LLL':
            return localize.month(month, {
              width: 'abbreviated',
              context: 'standalone'
            });
          // J, F, ..., D

          case 'LLLLL':
            return localize.month(month, {
              width: 'narrow',
              context: 'standalone'
            });
          // January, February, ..., December

          case 'LLLL':
          default:
            return localize.month(month, {
              width: 'wide',
              context: 'standalone'
            });
        }
      },
      // Local week of year
      w: function (date, token, localize, options) {
        var week = getUTCWeek(date, options);

        if (token === 'wo') {
          return localize.ordinalNumber(week, {
            unit: 'week'
          });
        }

        return addLeadingZeros(week, token.length);
      },
      // ISO week of year
      I: function (date, token, localize) {
        var isoWeek = getUTCISOWeek(date);

        if (token === 'Io') {
          return localize.ordinalNumber(isoWeek, {
            unit: 'week'
          });
        }

        return addLeadingZeros(isoWeek, token.length);
      },
      // Day of the month
      d: function (date, token, localize) {
        if (token === 'do') {
          return localize.ordinalNumber(date.getUTCDate(), {
            unit: 'date'
          });
        }

        return formatters.d(date, token);
      },
      // Day of year
      D: function (date, token, localize) {
        var dayOfYear = getUTCDayOfYear(date);

        if (token === 'Do') {
          return localize.ordinalNumber(dayOfYear, {
            unit: 'dayOfYear'
          });
        }

        return addLeadingZeros(dayOfYear, token.length);
      },
      // Day of week
      E: function (date, token, localize) {
        var dayOfWeek = date.getUTCDay();

        switch (token) {
          // Tue
          case 'E':
          case 'EE':
          case 'EEE':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // T

          case 'EEEEE':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'formatting'
            });
          // Tu

          case 'EEEEEE':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'formatting'
            });
          // Tuesday

          case 'EEEE':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Local day of week
      e: function (date, token, localize, options) {
        var dayOfWeek = date.getUTCDay();
        var localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;

        switch (token) {
          // Numerical value (Nth day of week with current locale or weekStartsOn)
          case 'e':
            return String(localDayOfWeek);
          // Padded numerical value

          case 'ee':
            return addLeadingZeros(localDayOfWeek, 2);
          // 1st, 2nd, ..., 7th

          case 'eo':
            return localize.ordinalNumber(localDayOfWeek, {
              unit: 'day'
            });

          case 'eee':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // T

          case 'eeeee':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'formatting'
            });
          // Tu

          case 'eeeeee':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'formatting'
            });
          // Tuesday

          case 'eeee':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Stand-alone local day of week
      c: function (date, token, localize, options) {
        var dayOfWeek = date.getUTCDay();
        var localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;

        switch (token) {
          // Numerical value (same as in `e`)
          case 'c':
            return String(localDayOfWeek);
          // Padded numerical value

          case 'cc':
            return addLeadingZeros(localDayOfWeek, token.length);
          // 1st, 2nd, ..., 7th

          case 'co':
            return localize.ordinalNumber(localDayOfWeek, {
              unit: 'day'
            });

          case 'ccc':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'standalone'
            });
          // T

          case 'ccccc':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'standalone'
            });
          // Tu

          case 'cccccc':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'standalone'
            });
          // Tuesday

          case 'cccc':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'standalone'
            });
        }
      },
      // ISO day of week
      i: function (date, token, localize) {
        var dayOfWeek = date.getUTCDay();
        var isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

        switch (token) {
          // 2
          case 'i':
            return String(isoDayOfWeek);
          // 02

          case 'ii':
            return addLeadingZeros(isoDayOfWeek, token.length);
          // 2nd

          case 'io':
            return localize.ordinalNumber(isoDayOfWeek, {
              unit: 'day'
            });
          // Tue

          case 'iii':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // T

          case 'iiiii':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'formatting'
            });
          // Tu

          case 'iiiiii':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'formatting'
            });
          // Tuesday

          case 'iiii':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // AM or PM
      a: function (date, token, localize) {
        var hours = date.getUTCHours();
        var dayPeriodEnumValue = hours / 12 >= 1 ? 'pm' : 'am';

        switch (token) {
          case 'a':
          case 'aa':
          case 'aaa':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            });

          case 'aaaaa':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'narrow',
              context: 'formatting'
            });

          case 'aaaa':
          default:
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // AM, PM, midnight, noon
      b: function (date, token, localize) {
        var hours = date.getUTCHours();
        var dayPeriodEnumValue;

        if (hours === 12) {
          dayPeriodEnumValue = dayPeriodEnum.noon;
        } else if (hours === 0) {
          dayPeriodEnumValue = dayPeriodEnum.midnight;
        } else {
          dayPeriodEnumValue = hours / 12 >= 1 ? 'pm' : 'am';
        }

        switch (token) {
          case 'b':
          case 'bb':
          case 'bbb':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            });

          case 'bbbbb':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'narrow',
              context: 'formatting'
            });

          case 'bbbb':
          default:
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // in the morning, in the afternoon, in the evening, at night
      B: function (date, token, localize) {
        var hours = date.getUTCHours();
        var dayPeriodEnumValue;

        if (hours >= 17) {
          dayPeriodEnumValue = dayPeriodEnum.evening;
        } else if (hours >= 12) {
          dayPeriodEnumValue = dayPeriodEnum.afternoon;
        } else if (hours >= 4) {
          dayPeriodEnumValue = dayPeriodEnum.morning;
        } else {
          dayPeriodEnumValue = dayPeriodEnum.night;
        }

        switch (token) {
          case 'B':
          case 'BB':
          case 'BBB':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            });

          case 'BBBBB':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'narrow',
              context: 'formatting'
            });

          case 'BBBB':
          default:
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Hour [1-12]
      h: function (date, token, localize) {
        if (token === 'ho') {
          var hours = date.getUTCHours() % 12;
          if (hours === 0) hours = 12;
          return localize.ordinalNumber(hours, {
            unit: 'hour'
          });
        }

        return formatters.h(date, token);
      },
      // Hour [0-23]
      H: function (date, token, localize) {
        if (token === 'Ho') {
          return localize.ordinalNumber(date.getUTCHours(), {
            unit: 'hour'
          });
        }

        return formatters.H(date, token);
      },
      // Hour [0-11]
      K: function (date, token, localize) {
        var hours = date.getUTCHours() % 12;

        if (token === 'Ko') {
          return localize.ordinalNumber(hours, {
            unit: 'hour'
          });
        }

        return addLeadingZeros(hours, token.length);
      },
      // Hour [1-24]
      k: function (date, token, localize) {
        var hours = date.getUTCHours();
        if (hours === 0) hours = 24;

        if (token === 'ko') {
          return localize.ordinalNumber(hours, {
            unit: 'hour'
          });
        }

        return addLeadingZeros(hours, token.length);
      },
      // Minute
      m: function (date, token, localize) {
        if (token === 'mo') {
          return localize.ordinalNumber(date.getUTCMinutes(), {
            unit: 'minute'
          });
        }

        return formatters.m(date, token);
      },
      // Second
      s: function (date, token, localize) {
        if (token === 'so') {
          return localize.ordinalNumber(date.getUTCSeconds(), {
            unit: 'second'
          });
        }

        return formatters.s(date, token);
      },
      // Fraction of second
      S: function (date, token) {
        return formatters.S(date, token);
      },
      // Timezone (ISO-8601. If offset is 0, output is always `'Z'`)
      X: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        if (timezoneOffset === 0) {
          return 'Z';
        }

        switch (token) {
          // Hours and optional minutes
          case 'X':
            return formatTimezoneWithOptionalMinutes(timezoneOffset);
          // Hours, minutes and optional seconds without `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `XX`

          case 'XXXX':
          case 'XX':
            // Hours and minutes without `:` delimiter
            return formatTimezone(timezoneOffset);
          // Hours, minutes and optional seconds with `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `XXX`

          case 'XXXXX':
          case 'XXX': // Hours and minutes with `:` delimiter

          default:
            return formatTimezone(timezoneOffset, ':');
        }
      },
      // Timezone (ISO-8601. If offset is 0, output is `'+00:00'` or equivalent)
      x: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        switch (token) {
          // Hours and optional minutes
          case 'x':
            return formatTimezoneWithOptionalMinutes(timezoneOffset);
          // Hours, minutes and optional seconds without `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `xx`

          case 'xxxx':
          case 'xx':
            // Hours and minutes without `:` delimiter
            return formatTimezone(timezoneOffset);
          // Hours, minutes and optional seconds with `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `xxx`

          case 'xxxxx':
          case 'xxx': // Hours and minutes with `:` delimiter

          default:
            return formatTimezone(timezoneOffset, ':');
        }
      },
      // Timezone (GMT)
      O: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        switch (token) {
          // Short
          case 'O':
          case 'OO':
          case 'OOO':
            return 'GMT' + formatTimezoneShort(timezoneOffset, ':');
          // Long

          case 'OOOO':
          default:
            return 'GMT' + formatTimezone(timezoneOffset, ':');
        }
      },
      // Timezone (specific non-location)
      z: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        switch (token) {
          // Short
          case 'z':
          case 'zz':
          case 'zzz':
            return 'GMT' + formatTimezoneShort(timezoneOffset, ':');
          // Long

          case 'zzzz':
          default:
            return 'GMT' + formatTimezone(timezoneOffset, ':');
        }
      },
      // Seconds timestamp
      t: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timestamp = Math.floor(originalDate.getTime() / 1000);
        return addLeadingZeros(timestamp, token.length);
      },
      // Milliseconds timestamp
      T: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timestamp = originalDate.getTime();
        return addLeadingZeros(timestamp, token.length);
      }
    };

    function formatTimezoneShort(offset, dirtyDelimiter) {
      var sign = offset > 0 ? '-' : '+';
      var absOffset = Math.abs(offset);
      var hours = Math.floor(absOffset / 60);
      var minutes = absOffset % 60;

      if (minutes === 0) {
        return sign + String(hours);
      }

      var delimiter = dirtyDelimiter || '';
      return sign + String(hours) + delimiter + addLeadingZeros(minutes, 2);
    }

    function formatTimezoneWithOptionalMinutes(offset, dirtyDelimiter) {
      if (offset % 60 === 0) {
        var sign = offset > 0 ? '-' : '+';
        return sign + addLeadingZeros(Math.abs(offset) / 60, 2);
      }

      return formatTimezone(offset, dirtyDelimiter);
    }

    function formatTimezone(offset, dirtyDelimiter) {
      var delimiter = dirtyDelimiter || '';
      var sign = offset > 0 ? '-' : '+';
      var absOffset = Math.abs(offset);
      var hours = addLeadingZeros(Math.floor(absOffset / 60), 2);
      var minutes = addLeadingZeros(absOffset % 60, 2);
      return sign + hours + delimiter + minutes;
    }

    function dateLongFormatter(pattern, formatLong) {
      switch (pattern) {
        case 'P':
          return formatLong.date({
            width: 'short'
          });

        case 'PP':
          return formatLong.date({
            width: 'medium'
          });

        case 'PPP':
          return formatLong.date({
            width: 'long'
          });

        case 'PPPP':
        default:
          return formatLong.date({
            width: 'full'
          });
      }
    }

    function timeLongFormatter(pattern, formatLong) {
      switch (pattern) {
        case 'p':
          return formatLong.time({
            width: 'short'
          });

        case 'pp':
          return formatLong.time({
            width: 'medium'
          });

        case 'ppp':
          return formatLong.time({
            width: 'long'
          });

        case 'pppp':
        default:
          return formatLong.time({
            width: 'full'
          });
      }
    }

    function dateTimeLongFormatter(pattern, formatLong) {
      var matchResult = pattern.match(/(P+)(p+)?/);
      var datePattern = matchResult[1];
      var timePattern = matchResult[2];

      if (!timePattern) {
        return dateLongFormatter(pattern, formatLong);
      }

      var dateTimeFormat;

      switch (datePattern) {
        case 'P':
          dateTimeFormat = formatLong.dateTime({
            width: 'short'
          });
          break;

        case 'PP':
          dateTimeFormat = formatLong.dateTime({
            width: 'medium'
          });
          break;

        case 'PPP':
          dateTimeFormat = formatLong.dateTime({
            width: 'long'
          });
          break;

        case 'PPPP':
        default:
          dateTimeFormat = formatLong.dateTime({
            width: 'full'
          });
          break;
      }

      return dateTimeFormat.replace('{{date}}', dateLongFormatter(datePattern, formatLong)).replace('{{time}}', timeLongFormatter(timePattern, formatLong));
    }

    var longFormatters = {
      p: timeLongFormatter,
      P: dateTimeLongFormatter
    };

    var protectedDayOfYearTokens = ['D', 'DD'];
    var protectedWeekYearTokens = ['YY', 'YYYY'];
    function isProtectedDayOfYearToken(token) {
      return protectedDayOfYearTokens.indexOf(token) !== -1;
    }
    function isProtectedWeekYearToken(token) {
      return protectedWeekYearTokens.indexOf(token) !== -1;
    }
    function throwProtectedError(token, format, input) {
      if (token === 'YYYY') {
        throw new RangeError("Use `yyyy` instead of `YYYY` (in `".concat(format, "`) for formatting years to the input `").concat(input, "`; see: https://git.io/fxCyr"));
      } else if (token === 'YY') {
        throw new RangeError("Use `yy` instead of `YY` (in `".concat(format, "`) for formatting years to the input `").concat(input, "`; see: https://git.io/fxCyr"));
      } else if (token === 'D') {
        throw new RangeError("Use `d` instead of `D` (in `".concat(format, "`) for formatting days of the month to the input `").concat(input, "`; see: https://git.io/fxCyr"));
      } else if (token === 'DD') {
        throw new RangeError("Use `dd` instead of `DD` (in `".concat(format, "`) for formatting days of the month to the input `").concat(input, "`; see: https://git.io/fxCyr"));
      }
    }

    // - [yYQqMLwIdDecihHKkms]o matches any available ordinal number token
    //   (one of the certain letters followed by `o`)
    // - (\w)\1* matches any sequences of the same letter
    // - '' matches two quote characters in a row
    // - '(''|[^'])+('|$) matches anything surrounded by two quote characters ('),
    //   except a single quote symbol, which ends the sequence.
    //   Two quote characters do not end the sequence.
    //   If there is no matching single quote
    //   then the sequence will continue until the end of the string.
    // - . matches any single character unmatched by previous parts of the RegExps

    var formattingTokensRegExp = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g; // This RegExp catches symbols escaped by quotes, and also
    // sequences of symbols P, p, and the combinations like `PPPPPPPppppp`

    var longFormattingTokensRegExp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
    var escapedStringRegExp = /^'([^]*?)'?$/;
    var doubleQuoteRegExp = /''/g;
    var unescapedLatinCharacterRegExp = /[a-zA-Z]/;
    /**
     * @name format
     * @category Common Helpers
     * @summary Format the date.
     *
     * @description
     * Return the formatted date string in the given format. The result may vary by locale.
     *
     * > ⚠️ Please note that the `format` tokens differ from Moment.js and other libraries.
     * > See: https://git.io/fxCyr
     *
     * The characters wrapped between two single quotes characters (') are escaped.
     * Two single quotes in a row, whether inside or outside a quoted sequence, represent a 'real' single quote.
     * (see the last example)
     *
     * Format of the string is based on Unicode Technical Standard #35:
     * https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
     * with a few additions (see note 7 below the table).
     *
     * Accepted patterns:
     * | Unit                            | Pattern | Result examples                   | Notes |
     * |---------------------------------|---------|-----------------------------------|-------|
     * | Era                             | G..GGG  | AD, BC                            |       |
     * |                                 | GGGG    | Anno Domini, Before Christ        | 2     |
     * |                                 | GGGGG   | A, B                              |       |
     * | Calendar year                   | y       | 44, 1, 1900, 2017                 | 5     |
     * |                                 | yo      | 44th, 1st, 0th, 17th              | 5,7   |
     * |                                 | yy      | 44, 01, 00, 17                    | 5     |
     * |                                 | yyy     | 044, 001, 1900, 2017              | 5     |
     * |                                 | yyyy    | 0044, 0001, 1900, 2017            | 5     |
     * |                                 | yyyyy   | ...                               | 3,5   |
     * | Local week-numbering year       | Y       | 44, 1, 1900, 2017                 | 5     |
     * |                                 | Yo      | 44th, 1st, 1900th, 2017th         | 5,7   |
     * |                                 | YY      | 44, 01, 00, 17                    | 5,8   |
     * |                                 | YYY     | 044, 001, 1900, 2017              | 5     |
     * |                                 | YYYY    | 0044, 0001, 1900, 2017            | 5,8   |
     * |                                 | YYYYY   | ...                               | 3,5   |
     * | ISO week-numbering year         | R       | -43, 0, 1, 1900, 2017             | 5,7   |
     * |                                 | RR      | -43, 00, 01, 1900, 2017           | 5,7   |
     * |                                 | RRR     | -043, 000, 001, 1900, 2017        | 5,7   |
     * |                                 | RRRR    | -0043, 0000, 0001, 1900, 2017     | 5,7   |
     * |                                 | RRRRR   | ...                               | 3,5,7 |
     * | Extended year                   | u       | -43, 0, 1, 1900, 2017             | 5     |
     * |                                 | uu      | -43, 01, 1900, 2017               | 5     |
     * |                                 | uuu     | -043, 001, 1900, 2017             | 5     |
     * |                                 | uuuu    | -0043, 0001, 1900, 2017           | 5     |
     * |                                 | uuuuu   | ...                               | 3,5   |
     * | Quarter (formatting)            | Q       | 1, 2, 3, 4                        |       |
     * |                                 | Qo      | 1st, 2nd, 3rd, 4th                | 7     |
     * |                                 | QQ      | 01, 02, 03, 04                    |       |
     * |                                 | QQQ     | Q1, Q2, Q3, Q4                    |       |
     * |                                 | QQQQ    | 1st quarter, 2nd quarter, ...     | 2     |
     * |                                 | QQQQQ   | 1, 2, 3, 4                        | 4     |
     * | Quarter (stand-alone)           | q       | 1, 2, 3, 4                        |       |
     * |                                 | qo      | 1st, 2nd, 3rd, 4th                | 7     |
     * |                                 | qq      | 01, 02, 03, 04                    |       |
     * |                                 | qqq     | Q1, Q2, Q3, Q4                    |       |
     * |                                 | qqqq    | 1st quarter, 2nd quarter, ...     | 2     |
     * |                                 | qqqqq   | 1, 2, 3, 4                        | 4     |
     * | Month (formatting)              | M       | 1, 2, ..., 12                     |       |
     * |                                 | Mo      | 1st, 2nd, ..., 12th               | 7     |
     * |                                 | MM      | 01, 02, ..., 12                   |       |
     * |                                 | MMM     | Jan, Feb, ..., Dec                |       |
     * |                                 | MMMM    | January, February, ..., December  | 2     |
     * |                                 | MMMMM   | J, F, ..., D                      |       |
     * | Month (stand-alone)             | L       | 1, 2, ..., 12                     |       |
     * |                                 | Lo      | 1st, 2nd, ..., 12th               | 7     |
     * |                                 | LL      | 01, 02, ..., 12                   |       |
     * |                                 | LLL     | Jan, Feb, ..., Dec                |       |
     * |                                 | LLLL    | January, February, ..., December  | 2     |
     * |                                 | LLLLL   | J, F, ..., D                      |       |
     * | Local week of year              | w       | 1, 2, ..., 53                     |       |
     * |                                 | wo      | 1st, 2nd, ..., 53th               | 7     |
     * |                                 | ww      | 01, 02, ..., 53                   |       |
     * | ISO week of year                | I       | 1, 2, ..., 53                     | 7     |
     * |                                 | Io      | 1st, 2nd, ..., 53th               | 7     |
     * |                                 | II      | 01, 02, ..., 53                   | 7     |
     * | Day of month                    | d       | 1, 2, ..., 31                     |       |
     * |                                 | do      | 1st, 2nd, ..., 31st               | 7     |
     * |                                 | dd      | 01, 02, ..., 31                   |       |
     * | Day of year                     | D       | 1, 2, ..., 365, 366               | 9     |
     * |                                 | Do      | 1st, 2nd, ..., 365th, 366th       | 7     |
     * |                                 | DD      | 01, 02, ..., 365, 366             | 9     |
     * |                                 | DDD     | 001, 002, ..., 365, 366           |       |
     * |                                 | DDDD    | ...                               | 3     |
     * | Day of week (formatting)        | E..EEE  | Mon, Tue, Wed, ..., Sun           |       |
     * |                                 | EEEE    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 | EEEEE   | M, T, W, T, F, S, S               |       |
     * |                                 | EEEEEE  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | ISO day of week (formatting)    | i       | 1, 2, 3, ..., 7                   | 7     |
     * |                                 | io      | 1st, 2nd, ..., 7th                | 7     |
     * |                                 | ii      | 01, 02, ..., 07                   | 7     |
     * |                                 | iii     | Mon, Tue, Wed, ..., Sun           | 7     |
     * |                                 | iiii    | Monday, Tuesday, ..., Sunday      | 2,7   |
     * |                                 | iiiii   | M, T, W, T, F, S, S               | 7     |
     * |                                 | iiiiii  | Mo, Tu, We, Th, Fr, Su, Sa        | 7     |
     * | Local day of week (formatting)  | e       | 2, 3, 4, ..., 1                   |       |
     * |                                 | eo      | 2nd, 3rd, ..., 1st                | 7     |
     * |                                 | ee      | 02, 03, ..., 01                   |       |
     * |                                 | eee     | Mon, Tue, Wed, ..., Sun           |       |
     * |                                 | eeee    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 | eeeee   | M, T, W, T, F, S, S               |       |
     * |                                 | eeeeee  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | Local day of week (stand-alone) | c       | 2, 3, 4, ..., 1                   |       |
     * |                                 | co      | 2nd, 3rd, ..., 1st                | 7     |
     * |                                 | cc      | 02, 03, ..., 01                   |       |
     * |                                 | ccc     | Mon, Tue, Wed, ..., Sun           |       |
     * |                                 | cccc    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 | ccccc   | M, T, W, T, F, S, S               |       |
     * |                                 | cccccc  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | AM, PM                          | a..aaa  | AM, PM                            |       |
     * |                                 | aaaa    | a.m., p.m.                        | 2     |
     * |                                 | aaaaa   | a, p                              |       |
     * | AM, PM, noon, midnight          | b..bbb  | AM, PM, noon, midnight            |       |
     * |                                 | bbbb    | a.m., p.m., noon, midnight        | 2     |
     * |                                 | bbbbb   | a, p, n, mi                       |       |
     * | Flexible day period             | B..BBB  | at night, in the morning, ...     |       |
     * |                                 | BBBB    | at night, in the morning, ...     | 2     |
     * |                                 | BBBBB   | at night, in the morning, ...     |       |
     * | Hour [1-12]                     | h       | 1, 2, ..., 11, 12                 |       |
     * |                                 | ho      | 1st, 2nd, ..., 11th, 12th         | 7     |
     * |                                 | hh      | 01, 02, ..., 11, 12               |       |
     * | Hour [0-23]                     | H       | 0, 1, 2, ..., 23                  |       |
     * |                                 | Ho      | 0th, 1st, 2nd, ..., 23rd          | 7     |
     * |                                 | HH      | 00, 01, 02, ..., 23               |       |
     * | Hour [0-11]                     | K       | 1, 2, ..., 11, 0                  |       |
     * |                                 | Ko      | 1st, 2nd, ..., 11th, 0th          | 7     |
     * |                                 | KK      | 01, 02, ..., 11, 00               |       |
     * | Hour [1-24]                     | k       | 24, 1, 2, ..., 23                 |       |
     * |                                 | ko      | 24th, 1st, 2nd, ..., 23rd         | 7     |
     * |                                 | kk      | 24, 01, 02, ..., 23               |       |
     * | Minute                          | m       | 0, 1, ..., 59                     |       |
     * |                                 | mo      | 0th, 1st, ..., 59th               | 7     |
     * |                                 | mm      | 00, 01, ..., 59                   |       |
     * | Second                          | s       | 0, 1, ..., 59                     |       |
     * |                                 | so      | 0th, 1st, ..., 59th               | 7     |
     * |                                 | ss      | 00, 01, ..., 59                   |       |
     * | Fraction of second              | S       | 0, 1, ..., 9                      |       |
     * |                                 | SS      | 00, 01, ..., 99                   |       |
     * |                                 | SSS     | 000, 0001, ..., 999               |       |
     * |                                 | SSSS    | ...                               | 3     |
     * | Timezone (ISO-8601 w/ Z)        | X       | -08, +0530, Z                     |       |
     * |                                 | XX      | -0800, +0530, Z                   |       |
     * |                                 | XXX     | -08:00, +05:30, Z                 |       |
     * |                                 | XXXX    | -0800, +0530, Z, +123456          | 2     |
     * |                                 | XXXXX   | -08:00, +05:30, Z, +12:34:56      |       |
     * | Timezone (ISO-8601 w/o Z)       | x       | -08, +0530, +00                   |       |
     * |                                 | xx      | -0800, +0530, +0000               |       |
     * |                                 | xxx     | -08:00, +05:30, +00:00            | 2     |
     * |                                 | xxxx    | -0800, +0530, +0000, +123456      |       |
     * |                                 | xxxxx   | -08:00, +05:30, +00:00, +12:34:56 |       |
     * | Timezone (GMT)                  | O...OOO | GMT-8, GMT+5:30, GMT+0            |       |
     * |                                 | OOOO    | GMT-08:00, GMT+05:30, GMT+00:00   | 2     |
     * | Timezone (specific non-locat.)  | z...zzz | GMT-8, GMT+5:30, GMT+0            | 6     |
     * |                                 | zzzz    | GMT-08:00, GMT+05:30, GMT+00:00   | 2,6   |
     * | Seconds timestamp               | t       | 512969520                         | 7     |
     * |                                 | tt      | ...                               | 3,7   |
     * | Milliseconds timestamp          | T       | 512969520900                      | 7     |
     * |                                 | TT      | ...                               | 3,7   |
     * | Long localized date             | P       | 05/29/1453                        | 7     |
     * |                                 | PP      | May 29, 1453                      | 7     |
     * |                                 | PPP     | May 29th, 1453                    | 7     |
     * |                                 | PPPP    | Sunday, May 29th, 1453            | 2,7   |
     * | Long localized time             | p       | 12:00 AM                          | 7     |
     * |                                 | pp      | 12:00:00 AM                       | 7     |
     * |                                 | ppp     | 12:00:00 AM GMT+2                 | 7     |
     * |                                 | pppp    | 12:00:00 AM GMT+02:00             | 2,7   |
     * | Combination of date and time    | Pp      | 05/29/1453, 12:00 AM              | 7     |
     * |                                 | PPpp    | May 29, 1453, 12:00:00 AM         | 7     |
     * |                                 | PPPppp  | May 29th, 1453 at ...             | 7     |
     * |                                 | PPPPpppp| Sunday, May 29th, 1453 at ...     | 2,7   |
     * Notes:
     * 1. "Formatting" units (e.g. formatting quarter) in the default en-US locale
     *    are the same as "stand-alone" units, but are different in some languages.
     *    "Formatting" units are declined according to the rules of the language
     *    in the context of a date. "Stand-alone" units are always nominative singular:
     *
     *    `format(new Date(2017, 10, 6), 'do LLLL', {locale: cs}) //=> '6. listopad'`
     *
     *    `format(new Date(2017, 10, 6), 'do MMMM', {locale: cs}) //=> '6. listopadu'`
     *
     * 2. Any sequence of the identical letters is a pattern, unless it is escaped by
     *    the single quote characters (see below).
     *    If the sequence is longer than listed in table (e.g. `EEEEEEEEEEE`)
     *    the output will be the same as default pattern for this unit, usually
     *    the longest one (in case of ISO weekdays, `EEEE`). Default patterns for units
     *    are marked with "2" in the last column of the table.
     *
     *    `format(new Date(2017, 10, 6), 'MMM') //=> 'Nov'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMM') //=> 'November'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMMM') //=> 'N'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMMMM') //=> 'November'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMMMMM') //=> 'November'`
     *
     * 3. Some patterns could be unlimited length (such as `yyyyyyyy`).
     *    The output will be padded with zeros to match the length of the pattern.
     *
     *    `format(new Date(2017, 10, 6), 'yyyyyyyy') //=> '00002017'`
     *
     * 4. `QQQQQ` and `qqqqq` could be not strictly numerical in some locales.
     *    These tokens represent the shortest form of the quarter.
     *
     * 5. The main difference between `y` and `u` patterns are B.C. years:
     *
     *    | Year | `y` | `u` |
     *    |------|-----|-----|
     *    | AC 1 |   1 |   1 |
     *    | BC 1 |   1 |   0 |
     *    | BC 2 |   2 |  -1 |
     *
     *    Also `yy` always returns the last two digits of a year,
     *    while `uu` pads single digit years to 2 characters and returns other years unchanged:
     *
     *    | Year | `yy` | `uu` |
     *    |------|------|------|
     *    | 1    |   01 |   01 |
     *    | 14   |   14 |   14 |
     *    | 376  |   76 |  376 |
     *    | 1453 |   53 | 1453 |
     *
     *    The same difference is true for local and ISO week-numbering years (`Y` and `R`),
     *    except local week-numbering years are dependent on `options.weekStartsOn`
     *    and `options.firstWeekContainsDate` (compare [getISOWeekYear]{@link https://date-fns.org/docs/getISOWeekYear}
     *    and [getWeekYear]{@link https://date-fns.org/docs/getWeekYear}).
     *
     * 6. Specific non-location timezones are currently unavailable in `date-fns`,
     *    so right now these tokens fall back to GMT timezones.
     *
     * 7. These patterns are not in the Unicode Technical Standard #35:
     *    - `i`: ISO day of week
     *    - `I`: ISO week of year
     *    - `R`: ISO week-numbering year
     *    - `t`: seconds timestamp
     *    - `T`: milliseconds timestamp
     *    - `o`: ordinal number modifier
     *    - `P`: long localized date
     *    - `p`: long localized time
     *
     * 8. `YY` and `YYYY` tokens represent week-numbering years but they are often confused with years.
     *    You should enable `options.useAdditionalWeekYearTokens` to use them. See: https://git.io/fxCyr
     *
     * 9. `D` and `DD` tokens represent days of the year but they are ofthen confused with days of the month.
     *    You should enable `options.useAdditionalDayOfYearTokens` to use them. See: https://git.io/fxCyr
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * - The second argument is now required for the sake of explicitness.
     *
     *   ```javascript
     *   // Before v2.0.0
     *   format(new Date(2016, 0, 1))
     *
     *   // v2.0.0 onward
     *   format(new Date(2016, 0, 1), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
     *   ```
     *
     * - New format string API for `format` function
     *   which is based on [Unicode Technical Standard #35](https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table).
     *   See [this post](https://blog.date-fns.org/post/unicode-tokens-in-date-fns-v2-sreatyki91jg) for more details.
     *
     * - Characters are now escaped using single quote symbols (`'`) instead of square brackets.
     *
     * @param {Date|Number} date - the original date
     * @param {String} format - the string of tokens
     * @param {Object} [options] - an object with options.
     * @param {Locale} [options.locale=defaultLocale] - the locale object. See [Locale]{@link https://date-fns.org/docs/Locale}
     * @param {0|1|2|3|4|5|6} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
     * @param {Number} [options.firstWeekContainsDate=1] - the day of January, which is
     * @param {Boolean} [options.useAdditionalWeekYearTokens=false] - if true, allows usage of the week-numbering year tokens `YY` and `YYYY`;
     *   see: https://git.io/fxCyr
     * @param {Boolean} [options.useAdditionalDayOfYearTokens=false] - if true, allows usage of the day of year tokens `D` and `DD`;
     *   see: https://git.io/fxCyr
     * @returns {String} the formatted date string
     * @throws {TypeError} 2 arguments required
     * @throws {RangeError} `date` must not be Invalid Date
     * @throws {RangeError} `options.locale` must contain `localize` property
     * @throws {RangeError} `options.locale` must contain `formatLong` property
     * @throws {RangeError} `options.weekStartsOn` must be between 0 and 6
     * @throws {RangeError} `options.firstWeekContainsDate` must be between 1 and 7
     * @throws {RangeError} use `yyyy` instead of `YYYY` for formatting years using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} use `yy` instead of `YY` for formatting years using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} use `d` instead of `D` for formatting days of the month using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} use `dd` instead of `DD` for formatting days of the month using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} format string contains an unescaped latin alphabet character
     *
     * @example
     * // Represent 11 February 2014 in middle-endian format:
     * var result = format(new Date(2014, 1, 11), 'MM/dd/yyyy')
     * //=> '02/11/2014'
     *
     * @example
     * // Represent 2 July 2014 in Esperanto:
     * import { eoLocale } from 'date-fns/locale/eo'
     * var result = format(new Date(2014, 6, 2), "do 'de' MMMM yyyy", {
     *   locale: eoLocale
     * })
     * //=> '2-a de julio 2014'
     *
     * @example
     * // Escape string by single quote characters:
     * var result = format(new Date(2014, 6, 2, 15), "h 'o''clock'")
     * //=> "3 o'clock"
     */

    function format(dirtyDate, dirtyFormatStr, dirtyOptions) {
      requiredArgs(2, arguments);
      var formatStr = String(dirtyFormatStr);
      var options = dirtyOptions || {};
      var locale$1 = options.locale || locale;
      var localeFirstWeekContainsDate = locale$1.options && locale$1.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate); // Test if weekStartsOn is between 1 and 7 _and_ is not NaN

      if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
        throw new RangeError('firstWeekContainsDate must be between 1 and 7 inclusively');
      }

      var localeWeekStartsOn = locale$1.options && locale$1.options.weekStartsOn;
      var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
      var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
        throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }

      if (!locale$1.localize) {
        throw new RangeError('locale must contain localize property');
      }

      if (!locale$1.formatLong) {
        throw new RangeError('locale must contain formatLong property');
      }

      var originalDate = toDate(dirtyDate);

      if (!isValid(originalDate)) {
        throw new RangeError('Invalid time value');
      } // Convert the date in system timezone to the same date in UTC+00:00 timezone.
      // This ensures that when UTC functions will be implemented, locales will be compatible with them.
      // See an issue about UTC functions: https://github.com/date-fns/date-fns/issues/376


      var timezoneOffset = getTimezoneOffsetInMilliseconds(originalDate);
      var utcDate = subMilliseconds(originalDate, timezoneOffset);
      var formatterOptions = {
        firstWeekContainsDate: firstWeekContainsDate,
        weekStartsOn: weekStartsOn,
        locale: locale$1,
        _originalDate: originalDate
      };
      var result = formatStr.match(longFormattingTokensRegExp).map(function (substring) {
        var firstCharacter = substring[0];

        if (firstCharacter === 'p' || firstCharacter === 'P') {
          var longFormatter = longFormatters[firstCharacter];
          return longFormatter(substring, locale$1.formatLong, formatterOptions);
        }

        return substring;
      }).join('').match(formattingTokensRegExp).map(function (substring) {
        // Replace two single quote characters with one single quote character
        if (substring === "''") {
          return "'";
        }

        var firstCharacter = substring[0];

        if (firstCharacter === "'") {
          return cleanEscapedString(substring);
        }

        var formatter = formatters$1[firstCharacter];

        if (formatter) {
          if (!options.useAdditionalWeekYearTokens && isProtectedWeekYearToken(substring)) {
            throwProtectedError(substring, dirtyFormatStr, dirtyDate);
          }

          if (!options.useAdditionalDayOfYearTokens && isProtectedDayOfYearToken(substring)) {
            throwProtectedError(substring, dirtyFormatStr, dirtyDate);
          }

          return formatter(utcDate, substring, locale$1.localize, formatterOptions);
        }

        if (firstCharacter.match(unescapedLatinCharacterRegExp)) {
          throw new RangeError('Format string contains an unescaped latin alphabet character `' + firstCharacter + '`');
        }

        return substring;
      }).join('');
      return result;
    }

    function cleanEscapedString(input) {
      return input.match(escapedStringRegExp)[1].replace(doubleQuoteRegExp, "'");
    }

    function assign(target, dirtyObject) {
      if (target == null) {
        throw new TypeError('assign requires that input parameter not be null or undefined');
      }

      dirtyObject = dirtyObject || {};

      for (var property in dirtyObject) {
        if (dirtyObject.hasOwnProperty(property)) {
          target[property] = dirtyObject[property];
        }
      }

      return target;
    }

    /**
     * @name getDaysInMonth
     * @category Month Helpers
     * @summary Get the number of days in a month of the given date.
     *
     * @description
     * Get the number of days in a month of the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the given date
     * @returns {Number} the number of days in a month
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // How many days are in February 2000?
     * var result = getDaysInMonth(new Date(2000, 1))
     * //=> 29
     */

    function getDaysInMonth(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var year = date.getFullYear();
      var monthIndex = date.getMonth();
      var lastDayOfMonth = new Date(0);
      lastDayOfMonth.setFullYear(year, monthIndex + 1, 0);
      lastDayOfMonth.setHours(0, 0, 0, 0);
      return lastDayOfMonth.getDate();
    }

    /**
     * @name getMonth
     * @category Month Helpers
     * @summary Get the month of the given date.
     *
     * @description
     * Get the month of the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the given date
     * @returns {Number} the month
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // Which month is 29 February 2012?
     * var result = getMonth(new Date(2012, 1, 29))
     * //=> 1
     */

    function getMonth(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var month = date.getMonth();
      return month;
    }

    /**
     * @name getYear
     * @category Year Helpers
     * @summary Get the year of the given date.
     *
     * @description
     * Get the year of the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the given date
     * @returns {Number} the year
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // Which year is 2 July 2014?
     * var result = getYear(new Date(2014, 6, 2))
     * //=> 2014
     */

    function getYear(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var year = date.getFullYear();
      return year;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function setUTCDay(dirtyDate, dirtyDay, dirtyOptions) {
      requiredArgs(2, arguments);
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeWeekStartsOn = locale && locale.options && locale.options.weekStartsOn;
      var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
      var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
        throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }

      var date = toDate(dirtyDate);
      var day = toInteger(dirtyDay);
      var currentDay = date.getUTCDay();
      var remainder = day % 7;
      var dayIndex = (remainder + 7) % 7;
      var diff = (dayIndex < weekStartsOn ? 7 : 0) + day - currentDay;
      date.setUTCDate(date.getUTCDate() + diff);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function setUTCISODay(dirtyDate, dirtyDay) {
      requiredArgs(2, arguments);
      var day = toInteger(dirtyDay);

      if (day % 7 === 0) {
        day = day - 7;
      }

      var weekStartsOn = 1;
      var date = toDate(dirtyDate);
      var currentDay = date.getUTCDay();
      var remainder = day % 7;
      var dayIndex = (remainder + 7) % 7;
      var diff = (dayIndex < weekStartsOn ? 7 : 0) + day - currentDay;
      date.setUTCDate(date.getUTCDate() + diff);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function setUTCISOWeek(dirtyDate, dirtyISOWeek) {
      requiredArgs(2, arguments);
      var date = toDate(dirtyDate);
      var isoWeek = toInteger(dirtyISOWeek);
      var diff = getUTCISOWeek(date) - isoWeek;
      date.setUTCDate(date.getUTCDate() - diff * 7);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function setUTCWeek(dirtyDate, dirtyWeek, options) {
      requiredArgs(2, arguments);
      var date = toDate(dirtyDate);
      var week = toInteger(dirtyWeek);
      var diff = getUTCWeek(date, options) - week;
      date.setUTCDate(date.getUTCDate() - diff * 7);
      return date;
    }

    var MILLISECONDS_IN_HOUR = 3600000;
    var MILLISECONDS_IN_MINUTE$1 = 60000;
    var MILLISECONDS_IN_SECOND = 1000;
    var numericPatterns = {
      month: /^(1[0-2]|0?\d)/,
      // 0 to 12
      date: /^(3[0-1]|[0-2]?\d)/,
      // 0 to 31
      dayOfYear: /^(36[0-6]|3[0-5]\d|[0-2]?\d?\d)/,
      // 0 to 366
      week: /^(5[0-3]|[0-4]?\d)/,
      // 0 to 53
      hour23h: /^(2[0-3]|[0-1]?\d)/,
      // 0 to 23
      hour24h: /^(2[0-4]|[0-1]?\d)/,
      // 0 to 24
      hour11h: /^(1[0-1]|0?\d)/,
      // 0 to 11
      hour12h: /^(1[0-2]|0?\d)/,
      // 0 to 12
      minute: /^[0-5]?\d/,
      // 0 to 59
      second: /^[0-5]?\d/,
      // 0 to 59
      singleDigit: /^\d/,
      // 0 to 9
      twoDigits: /^\d{1,2}/,
      // 0 to 99
      threeDigits: /^\d{1,3}/,
      // 0 to 999
      fourDigits: /^\d{1,4}/,
      // 0 to 9999
      anyDigitsSigned: /^-?\d+/,
      singleDigitSigned: /^-?\d/,
      // 0 to 9, -0 to -9
      twoDigitsSigned: /^-?\d{1,2}/,
      // 0 to 99, -0 to -99
      threeDigitsSigned: /^-?\d{1,3}/,
      // 0 to 999, -0 to -999
      fourDigitsSigned: /^-?\d{1,4}/ // 0 to 9999, -0 to -9999

    };
    var timezonePatterns = {
      basicOptionalMinutes: /^([+-])(\d{2})(\d{2})?|Z/,
      basic: /^([+-])(\d{2})(\d{2})|Z/,
      basicOptionalSeconds: /^([+-])(\d{2})(\d{2})((\d{2}))?|Z/,
      extended: /^([+-])(\d{2}):(\d{2})|Z/,
      extendedOptionalSeconds: /^([+-])(\d{2}):(\d{2})(:(\d{2}))?|Z/
    };

    function parseNumericPattern(pattern, string, valueCallback) {
      var matchResult = string.match(pattern);

      if (!matchResult) {
        return null;
      }

      var value = parseInt(matchResult[0], 10);
      return {
        value: valueCallback ? valueCallback(value) : value,
        rest: string.slice(matchResult[0].length)
      };
    }

    function parseTimezonePattern(pattern, string) {
      var matchResult = string.match(pattern);

      if (!matchResult) {
        return null;
      } // Input is 'Z'


      if (matchResult[0] === 'Z') {
        return {
          value: 0,
          rest: string.slice(1)
        };
      }

      var sign = matchResult[1] === '+' ? 1 : -1;
      var hours = matchResult[2] ? parseInt(matchResult[2], 10) : 0;
      var minutes = matchResult[3] ? parseInt(matchResult[3], 10) : 0;
      var seconds = matchResult[5] ? parseInt(matchResult[5], 10) : 0;
      return {
        value: sign * (hours * MILLISECONDS_IN_HOUR + minutes * MILLISECONDS_IN_MINUTE$1 + seconds * MILLISECONDS_IN_SECOND),
        rest: string.slice(matchResult[0].length)
      };
    }

    function parseAnyDigitsSigned(string, valueCallback) {
      return parseNumericPattern(numericPatterns.anyDigitsSigned, string, valueCallback);
    }

    function parseNDigits(n, string, valueCallback) {
      switch (n) {
        case 1:
          return parseNumericPattern(numericPatterns.singleDigit, string, valueCallback);

        case 2:
          return parseNumericPattern(numericPatterns.twoDigits, string, valueCallback);

        case 3:
          return parseNumericPattern(numericPatterns.threeDigits, string, valueCallback);

        case 4:
          return parseNumericPattern(numericPatterns.fourDigits, string, valueCallback);

        default:
          return parseNumericPattern(new RegExp('^\\d{1,' + n + '}'), string, valueCallback);
      }
    }

    function parseNDigitsSigned(n, string, valueCallback) {
      switch (n) {
        case 1:
          return parseNumericPattern(numericPatterns.singleDigitSigned, string, valueCallback);

        case 2:
          return parseNumericPattern(numericPatterns.twoDigitsSigned, string, valueCallback);

        case 3:
          return parseNumericPattern(numericPatterns.threeDigitsSigned, string, valueCallback);

        case 4:
          return parseNumericPattern(numericPatterns.fourDigitsSigned, string, valueCallback);

        default:
          return parseNumericPattern(new RegExp('^-?\\d{1,' + n + '}'), string, valueCallback);
      }
    }

    function dayPeriodEnumToHours(enumValue) {
      switch (enumValue) {
        case 'morning':
          return 4;

        case 'evening':
          return 17;

        case 'pm':
        case 'noon':
        case 'afternoon':
          return 12;

        case 'am':
        case 'midnight':
        case 'night':
        default:
          return 0;
      }
    }

    function normalizeTwoDigitYear(twoDigitYear, currentYear) {
      var isCommonEra = currentYear > 0; // Absolute number of the current year:
      // 1 -> 1 AC
      // 0 -> 1 BC
      // -1 -> 2 BC

      var absCurrentYear = isCommonEra ? currentYear : 1 - currentYear;
      var result;

      if (absCurrentYear <= 50) {
        result = twoDigitYear || 100;
      } else {
        var rangeEnd = absCurrentYear + 50;
        var rangeEndCentury = Math.floor(rangeEnd / 100) * 100;
        var isPreviousCentury = twoDigitYear >= rangeEnd % 100;
        result = twoDigitYear + rangeEndCentury - (isPreviousCentury ? 100 : 0);
      }

      return isCommonEra ? result : 1 - result;
    }

    var DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var DAYS_IN_MONTH_LEAP_YEAR = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // User for validation

    function isLeapYearIndex(year) {
      return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;
    }
    /*
     * |     | Unit                           |     | Unit                           |
     * |-----|--------------------------------|-----|--------------------------------|
     * |  a  | AM, PM                         |  A* | Milliseconds in day            |
     * |  b  | AM, PM, noon, midnight         |  B  | Flexible day period            |
     * |  c  | Stand-alone local day of week  |  C* | Localized hour w/ day period   |
     * |  d  | Day of month                   |  D  | Day of year                    |
     * |  e  | Local day of week              |  E  | Day of week                    |
     * |  f  |                                |  F* | Day of week in month           |
     * |  g* | Modified Julian day            |  G  | Era                            |
     * |  h  | Hour [1-12]                    |  H  | Hour [0-23]                    |
     * |  i! | ISO day of week                |  I! | ISO week of year               |
     * |  j* | Localized hour w/ day period   |  J* | Localized hour w/o day period  |
     * |  k  | Hour [1-24]                    |  K  | Hour [0-11]                    |
     * |  l* | (deprecated)                   |  L  | Stand-alone month              |
     * |  m  | Minute                         |  M  | Month                          |
     * |  n  |                                |  N  |                                |
     * |  o! | Ordinal number modifier        |  O* | Timezone (GMT)                 |
     * |  p  |                                |  P  |                                |
     * |  q  | Stand-alone quarter            |  Q  | Quarter                        |
     * |  r* | Related Gregorian year         |  R! | ISO week-numbering year        |
     * |  s  | Second                         |  S  | Fraction of second             |
     * |  t! | Seconds timestamp              |  T! | Milliseconds timestamp         |
     * |  u  | Extended year                  |  U* | Cyclic year                    |
     * |  v* | Timezone (generic non-locat.)  |  V* | Timezone (location)            |
     * |  w  | Local week of year             |  W* | Week of month                  |
     * |  x  | Timezone (ISO-8601 w/o Z)      |  X  | Timezone (ISO-8601)            |
     * |  y  | Year (abs)                     |  Y  | Local week-numbering year      |
     * |  z* | Timezone (specific non-locat.) |  Z* | Timezone (aliases)             |
     *
     * Letters marked by * are not implemented but reserved by Unicode standard.
     *
     * Letters marked by ! are non-standard, but implemented by date-fns:
     * - `o` modifies the previous token to turn it into an ordinal (see `parse` docs)
     * - `i` is ISO day of week. For `i` and `ii` is returns numeric ISO week days,
     *   i.e. 7 for Sunday, 1 for Monday, etc.
     * - `I` is ISO week of year, as opposed to `w` which is local week of year.
     * - `R` is ISO week-numbering year, as opposed to `Y` which is local week-numbering year.
     *   `R` is supposed to be used in conjunction with `I` and `i`
     *   for universal ISO week-numbering date, whereas
     *   `Y` is supposed to be used in conjunction with `w` and `e`
     *   for week-numbering date specific to the locale.
     */


    var parsers = {
      // Era
      G: {
        priority: 140,
        parse: function (string, token, match, _options) {
          switch (token) {
            // AD, BC
            case 'G':
            case 'GG':
            case 'GGG':
              return match.era(string, {
                width: 'abbreviated'
              }) || match.era(string, {
                width: 'narrow'
              });
            // A, B

            case 'GGGGG':
              return match.era(string, {
                width: 'narrow'
              });
            // Anno Domini, Before Christ

            case 'GGGG':
            default:
              return match.era(string, {
                width: 'wide'
              }) || match.era(string, {
                width: 'abbreviated'
              }) || match.era(string, {
                width: 'narrow'
              });
          }
        },
        set: function (date, flags, value, _options) {
          flags.era = value;
          date.setUTCFullYear(value, 0, 1);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['R', 'u', 't', 'T']
      },
      // Year
      y: {
        // From http://www.unicode.org/reports/tr35/tr35-31/tr35-dates.html#Date_Format_Patterns
        // | Year     |     y | yy |   yyy |  yyyy | yyyyy |
        // |----------|-------|----|-------|-------|-------|
        // | AD 1     |     1 | 01 |   001 |  0001 | 00001 |
        // | AD 12    |    12 | 12 |   012 |  0012 | 00012 |
        // | AD 123   |   123 | 23 |   123 |  0123 | 00123 |
        // | AD 1234  |  1234 | 34 |  1234 |  1234 | 01234 |
        // | AD 12345 | 12345 | 45 | 12345 | 12345 | 12345 |
        priority: 130,
        parse: function (string, token, match, _options) {
          var valueCallback = function (year) {
            return {
              year: year,
              isTwoDigitYear: token === 'yy'
            };
          };

          switch (token) {
            case 'y':
              return parseNDigits(4, string, valueCallback);

            case 'yo':
              return match.ordinalNumber(string, {
                unit: 'year',
                valueCallback: valueCallback
              });

            default:
              return parseNDigits(token.length, string, valueCallback);
          }
        },
        validate: function (_date, value, _options) {
          return value.isTwoDigitYear || value.year > 0;
        },
        set: function (date, flags, value, _options) {
          var currentYear = date.getUTCFullYear();

          if (value.isTwoDigitYear) {
            var normalizedTwoDigitYear = normalizeTwoDigitYear(value.year, currentYear);
            date.setUTCFullYear(normalizedTwoDigitYear, 0, 1);
            date.setUTCHours(0, 0, 0, 0);
            return date;
          }

          var year = !('era' in flags) || flags.era === 1 ? value.year : 1 - value.year;
          date.setUTCFullYear(year, 0, 1);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['Y', 'R', 'u', 'w', 'I', 'i', 'e', 'c', 't', 'T']
      },
      // Local week-numbering year
      Y: {
        priority: 130,
        parse: function (string, token, match, _options) {
          var valueCallback = function (year) {
            return {
              year: year,
              isTwoDigitYear: token === 'YY'
            };
          };

          switch (token) {
            case 'Y':
              return parseNDigits(4, string, valueCallback);

            case 'Yo':
              return match.ordinalNumber(string, {
                unit: 'year',
                valueCallback: valueCallback
              });

            default:
              return parseNDigits(token.length, string, valueCallback);
          }
        },
        validate: function (_date, value, _options) {
          return value.isTwoDigitYear || value.year > 0;
        },
        set: function (date, flags, value, options) {
          var currentYear = getUTCWeekYear(date, options);

          if (value.isTwoDigitYear) {
            var normalizedTwoDigitYear = normalizeTwoDigitYear(value.year, currentYear);
            date.setUTCFullYear(normalizedTwoDigitYear, 0, options.firstWeekContainsDate);
            date.setUTCHours(0, 0, 0, 0);
            return startOfUTCWeek(date, options);
          }

          var year = !('era' in flags) || flags.era === 1 ? value.year : 1 - value.year;
          date.setUTCFullYear(year, 0, options.firstWeekContainsDate);
          date.setUTCHours(0, 0, 0, 0);
          return startOfUTCWeek(date, options);
        },
        incompatibleTokens: ['y', 'R', 'u', 'Q', 'q', 'M', 'L', 'I', 'd', 'D', 'i', 't', 'T']
      },
      // ISO week-numbering year
      R: {
        priority: 130,
        parse: function (string, token, _match, _options) {
          if (token === 'R') {
            return parseNDigitsSigned(4, string);
          }

          return parseNDigitsSigned(token.length, string);
        },
        set: function (_date, _flags, value, _options) {
          var firstWeekOfYear = new Date(0);
          firstWeekOfYear.setUTCFullYear(value, 0, 4);
          firstWeekOfYear.setUTCHours(0, 0, 0, 0);
          return startOfUTCISOWeek(firstWeekOfYear);
        },
        incompatibleTokens: ['G', 'y', 'Y', 'u', 'Q', 'q', 'M', 'L', 'w', 'd', 'D', 'e', 'c', 't', 'T']
      },
      // Extended year
      u: {
        priority: 130,
        parse: function (string, token, _match, _options) {
          if (token === 'u') {
            return parseNDigitsSigned(4, string);
          }

          return parseNDigitsSigned(token.length, string);
        },
        set: function (date, _flags, value, _options) {
          date.setUTCFullYear(value, 0, 1);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['G', 'y', 'Y', 'R', 'w', 'I', 'i', 'e', 'c', 't', 'T']
      },
      // Quarter
      Q: {
        priority: 120,
        parse: function (string, token, match, _options) {
          switch (token) {
            // 1, 2, 3, 4
            case 'Q':
            case 'QQ':
              // 01, 02, 03, 04
              return parseNDigits(token.length, string);
            // 1st, 2nd, 3rd, 4th

            case 'Qo':
              return match.ordinalNumber(string, {
                unit: 'quarter'
              });
            // Q1, Q2, Q3, Q4

            case 'QQQ':
              return match.quarter(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.quarter(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // 1, 2, 3, 4 (narrow quarter; could be not numerical)

            case 'QQQQQ':
              return match.quarter(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // 1st quarter, 2nd quarter, ...

            case 'QQQQ':
            default:
              return match.quarter(string, {
                width: 'wide',
                context: 'formatting'
              }) || match.quarter(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.quarter(string, {
                width: 'narrow',
                context: 'formatting'
              });
          }
        },
        validate: function (_date, value, _options) {
          return value >= 1 && value <= 4;
        },
        set: function (date, _flags, value, _options) {
          date.setUTCMonth((value - 1) * 3, 1);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['Y', 'R', 'q', 'M', 'L', 'w', 'I', 'd', 'D', 'i', 'e', 'c', 't', 'T']
      },
      // Stand-alone quarter
      q: {
        priority: 120,
        parse: function (string, token, match, _options) {
          switch (token) {
            // 1, 2, 3, 4
            case 'q':
            case 'qq':
              // 01, 02, 03, 04
              return parseNDigits(token.length, string);
            // 1st, 2nd, 3rd, 4th

            case 'qo':
              return match.ordinalNumber(string, {
                unit: 'quarter'
              });
            // Q1, Q2, Q3, Q4

            case 'qqq':
              return match.quarter(string, {
                width: 'abbreviated',
                context: 'standalone'
              }) || match.quarter(string, {
                width: 'narrow',
                context: 'standalone'
              });
            // 1, 2, 3, 4 (narrow quarter; could be not numerical)

            case 'qqqqq':
              return match.quarter(string, {
                width: 'narrow',
                context: 'standalone'
              });
            // 1st quarter, 2nd quarter, ...

            case 'qqqq':
            default:
              return match.quarter(string, {
                width: 'wide',
                context: 'standalone'
              }) || match.quarter(string, {
                width: 'abbreviated',
                context: 'standalone'
              }) || match.quarter(string, {
                width: 'narrow',
                context: 'standalone'
              });
          }
        },
        validate: function (_date, value, _options) {
          return value >= 1 && value <= 4;
        },
        set: function (date, _flags, value, _options) {
          date.setUTCMonth((value - 1) * 3, 1);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['Y', 'R', 'Q', 'M', 'L', 'w', 'I', 'd', 'D', 'i', 'e', 'c', 't', 'T']
      },
      // Month
      M: {
        priority: 110,
        parse: function (string, token, match, _options) {
          var valueCallback = function (value) {
            return value - 1;
          };

          switch (token) {
            // 1, 2, ..., 12
            case 'M':
              return parseNumericPattern(numericPatterns.month, string, valueCallback);
            // 01, 02, ..., 12

            case 'MM':
              return parseNDigits(2, string, valueCallback);
            // 1st, 2nd, ..., 12th

            case 'Mo':
              return match.ordinalNumber(string, {
                unit: 'month',
                valueCallback: valueCallback
              });
            // Jan, Feb, ..., Dec

            case 'MMM':
              return match.month(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.month(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // J, F, ..., D

            case 'MMMMM':
              return match.month(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // January, February, ..., December

            case 'MMMM':
            default:
              return match.month(string, {
                width: 'wide',
                context: 'formatting'
              }) || match.month(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.month(string, {
                width: 'narrow',
                context: 'formatting'
              });
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 11;
        },
        set: function (date, _flags, value, _options) {
          date.setUTCMonth(value, 1);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['Y', 'R', 'q', 'Q', 'L', 'w', 'I', 'D', 'i', 'e', 'c', 't', 'T']
      },
      // Stand-alone month
      L: {
        priority: 110,
        parse: function (string, token, match, _options) {
          var valueCallback = function (value) {
            return value - 1;
          };

          switch (token) {
            // 1, 2, ..., 12
            case 'L':
              return parseNumericPattern(numericPatterns.month, string, valueCallback);
            // 01, 02, ..., 12

            case 'LL':
              return parseNDigits(2, string, valueCallback);
            // 1st, 2nd, ..., 12th

            case 'Lo':
              return match.ordinalNumber(string, {
                unit: 'month',
                valueCallback: valueCallback
              });
            // Jan, Feb, ..., Dec

            case 'LLL':
              return match.month(string, {
                width: 'abbreviated',
                context: 'standalone'
              }) || match.month(string, {
                width: 'narrow',
                context: 'standalone'
              });
            // J, F, ..., D

            case 'LLLLL':
              return match.month(string, {
                width: 'narrow',
                context: 'standalone'
              });
            // January, February, ..., December

            case 'LLLL':
            default:
              return match.month(string, {
                width: 'wide',
                context: 'standalone'
              }) || match.month(string, {
                width: 'abbreviated',
                context: 'standalone'
              }) || match.month(string, {
                width: 'narrow',
                context: 'standalone'
              });
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 11;
        },
        set: function (date, _flags, value, _options) {
          date.setUTCMonth(value, 1);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['Y', 'R', 'q', 'Q', 'M', 'w', 'I', 'D', 'i', 'e', 'c', 't', 'T']
      },
      // Local week of year
      w: {
        priority: 100,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'w':
              return parseNumericPattern(numericPatterns.week, string);

            case 'wo':
              return match.ordinalNumber(string, {
                unit: 'week'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (_date, value, _options) {
          return value >= 1 && value <= 53;
        },
        set: function (date, _flags, value, options) {
          return startOfUTCWeek(setUTCWeek(date, value, options), options);
        },
        incompatibleTokens: ['y', 'R', 'u', 'q', 'Q', 'M', 'L', 'I', 'd', 'D', 'i', 't', 'T']
      },
      // ISO week of year
      I: {
        priority: 100,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'I':
              return parseNumericPattern(numericPatterns.week, string);

            case 'Io':
              return match.ordinalNumber(string, {
                unit: 'week'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (_date, value, _options) {
          return value >= 1 && value <= 53;
        },
        set: function (date, _flags, value, options) {
          return startOfUTCISOWeek(setUTCISOWeek(date, value, options), options);
        },
        incompatibleTokens: ['y', 'Y', 'u', 'q', 'Q', 'M', 'L', 'w', 'd', 'D', 'e', 'c', 't', 'T']
      },
      // Day of the month
      d: {
        priority: 90,
        subPriority: 1,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'd':
              return parseNumericPattern(numericPatterns.date, string);

            case 'do':
              return match.ordinalNumber(string, {
                unit: 'date'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (date, value, _options) {
          var year = date.getUTCFullYear();
          var isLeapYear = isLeapYearIndex(year);
          var month = date.getUTCMonth();

          if (isLeapYear) {
            return value >= 1 && value <= DAYS_IN_MONTH_LEAP_YEAR[month];
          } else {
            return value >= 1 && value <= DAYS_IN_MONTH[month];
          }
        },
        set: function (date, _flags, value, _options) {
          date.setUTCDate(value);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['Y', 'R', 'q', 'Q', 'w', 'I', 'D', 'i', 'e', 'c', 't', 'T']
      },
      // Day of year
      D: {
        priority: 90,
        subPriority: 1,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'D':
            case 'DD':
              return parseNumericPattern(numericPatterns.dayOfYear, string);

            case 'Do':
              return match.ordinalNumber(string, {
                unit: 'date'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (date, value, _options) {
          var year = date.getUTCFullYear();
          var isLeapYear = isLeapYearIndex(year);

          if (isLeapYear) {
            return value >= 1 && value <= 366;
          } else {
            return value >= 1 && value <= 365;
          }
        },
        set: function (date, _flags, value, _options) {
          date.setUTCMonth(0, value);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['Y', 'R', 'q', 'Q', 'M', 'L', 'w', 'I', 'd', 'E', 'i', 'e', 'c', 't', 'T']
      },
      // Day of week
      E: {
        priority: 90,
        parse: function (string, token, match, _options) {
          switch (token) {
            // Tue
            case 'E':
            case 'EE':
            case 'EEE':
              return match.day(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.day(string, {
                width: 'short',
                context: 'formatting'
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // T

            case 'EEEEE':
              return match.day(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // Tu

            case 'EEEEEE':
              return match.day(string, {
                width: 'short',
                context: 'formatting'
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // Tuesday

            case 'EEEE':
            default:
              return match.day(string, {
                width: 'wide',
                context: 'formatting'
              }) || match.day(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.day(string, {
                width: 'short',
                context: 'formatting'
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting'
              });
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 6;
        },
        set: function (date, _flags, value, options) {
          date = setUTCDay(date, value, options);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['D', 'i', 'e', 'c', 't', 'T']
      },
      // Local day of week
      e: {
        priority: 90,
        parse: function (string, token, match, options) {
          var valueCallback = function (value) {
            var wholeWeekDays = Math.floor((value - 1) / 7) * 7;
            return (value + options.weekStartsOn + 6) % 7 + wholeWeekDays;
          };

          switch (token) {
            // 3
            case 'e':
            case 'ee':
              // 03
              return parseNDigits(token.length, string, valueCallback);
            // 3rd

            case 'eo':
              return match.ordinalNumber(string, {
                unit: 'day',
                valueCallback: valueCallback
              });
            // Tue

            case 'eee':
              return match.day(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.day(string, {
                width: 'short',
                context: 'formatting'
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // T

            case 'eeeee':
              return match.day(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // Tu

            case 'eeeeee':
              return match.day(string, {
                width: 'short',
                context: 'formatting'
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // Tuesday

            case 'eeee':
            default:
              return match.day(string, {
                width: 'wide',
                context: 'formatting'
              }) || match.day(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.day(string, {
                width: 'short',
                context: 'formatting'
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting'
              });
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 6;
        },
        set: function (date, _flags, value, options) {
          date = setUTCDay(date, value, options);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['y', 'R', 'u', 'q', 'Q', 'M', 'L', 'I', 'd', 'D', 'E', 'i', 'c', 't', 'T']
      },
      // Stand-alone local day of week
      c: {
        priority: 90,
        parse: function (string, token, match, options) {
          var valueCallback = function (value) {
            var wholeWeekDays = Math.floor((value - 1) / 7) * 7;
            return (value + options.weekStartsOn + 6) % 7 + wholeWeekDays;
          };

          switch (token) {
            // 3
            case 'c':
            case 'cc':
              // 03
              return parseNDigits(token.length, string, valueCallback);
            // 3rd

            case 'co':
              return match.ordinalNumber(string, {
                unit: 'day',
                valueCallback: valueCallback
              });
            // Tue

            case 'ccc':
              return match.day(string, {
                width: 'abbreviated',
                context: 'standalone'
              }) || match.day(string, {
                width: 'short',
                context: 'standalone'
              }) || match.day(string, {
                width: 'narrow',
                context: 'standalone'
              });
            // T

            case 'ccccc':
              return match.day(string, {
                width: 'narrow',
                context: 'standalone'
              });
            // Tu

            case 'cccccc':
              return match.day(string, {
                width: 'short',
                context: 'standalone'
              }) || match.day(string, {
                width: 'narrow',
                context: 'standalone'
              });
            // Tuesday

            case 'cccc':
            default:
              return match.day(string, {
                width: 'wide',
                context: 'standalone'
              }) || match.day(string, {
                width: 'abbreviated',
                context: 'standalone'
              }) || match.day(string, {
                width: 'short',
                context: 'standalone'
              }) || match.day(string, {
                width: 'narrow',
                context: 'standalone'
              });
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 6;
        },
        set: function (date, _flags, value, options) {
          date = setUTCDay(date, value, options);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['y', 'R', 'u', 'q', 'Q', 'M', 'L', 'I', 'd', 'D', 'E', 'i', 'e', 't', 'T']
      },
      // ISO day of week
      i: {
        priority: 90,
        parse: function (string, token, match, _options) {
          var valueCallback = function (value) {
            if (value === 0) {
              return 7;
            }

            return value;
          };

          switch (token) {
            // 2
            case 'i':
            case 'ii':
              // 02
              return parseNDigits(token.length, string);
            // 2nd

            case 'io':
              return match.ordinalNumber(string, {
                unit: 'day'
              });
            // Tue

            case 'iii':
              return match.day(string, {
                width: 'abbreviated',
                context: 'formatting',
                valueCallback: valueCallback
              }) || match.day(string, {
                width: 'short',
                context: 'formatting',
                valueCallback: valueCallback
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting',
                valueCallback: valueCallback
              });
            // T

            case 'iiiii':
              return match.day(string, {
                width: 'narrow',
                context: 'formatting',
                valueCallback: valueCallback
              });
            // Tu

            case 'iiiiii':
              return match.day(string, {
                width: 'short',
                context: 'formatting',
                valueCallback: valueCallback
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting',
                valueCallback: valueCallback
              });
            // Tuesday

            case 'iiii':
            default:
              return match.day(string, {
                width: 'wide',
                context: 'formatting',
                valueCallback: valueCallback
              }) || match.day(string, {
                width: 'abbreviated',
                context: 'formatting',
                valueCallback: valueCallback
              }) || match.day(string, {
                width: 'short',
                context: 'formatting',
                valueCallback: valueCallback
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting',
                valueCallback: valueCallback
              });
          }
        },
        validate: function (_date, value, _options) {
          return value >= 1 && value <= 7;
        },
        set: function (date, _flags, value, options) {
          date = setUTCISODay(date, value, options);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['y', 'Y', 'u', 'q', 'Q', 'M', 'L', 'w', 'd', 'D', 'E', 'e', 'c', 't', 'T']
      },
      // AM or PM
      a: {
        priority: 80,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'a':
            case 'aa':
            case 'aaa':
              return match.dayPeriod(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });

            case 'aaaaa':
              return match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });

            case 'aaaa':
            default:
              return match.dayPeriod(string, {
                width: 'wide',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });
          }
        },
        set: function (date, _flags, value, _options) {
          date.setUTCHours(dayPeriodEnumToHours(value), 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['b', 'B', 'H', 'K', 'k', 't', 'T']
      },
      // AM, PM, midnight
      b: {
        priority: 80,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'b':
            case 'bb':
            case 'bbb':
              return match.dayPeriod(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });

            case 'bbbbb':
              return match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });

            case 'bbbb':
            default:
              return match.dayPeriod(string, {
                width: 'wide',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });
          }
        },
        set: function (date, _flags, value, _options) {
          date.setUTCHours(dayPeriodEnumToHours(value), 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['a', 'B', 'H', 'K', 'k', 't', 'T']
      },
      // in the morning, in the afternoon, in the evening, at night
      B: {
        priority: 80,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'B':
            case 'BB':
            case 'BBB':
              return match.dayPeriod(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });

            case 'BBBBB':
              return match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });

            case 'BBBB':
            default:
              return match.dayPeriod(string, {
                width: 'wide',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });
          }
        },
        set: function (date, _flags, value, _options) {
          date.setUTCHours(dayPeriodEnumToHours(value), 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['a', 'b', 't', 'T']
      },
      // Hour [1-12]
      h: {
        priority: 70,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'h':
              return parseNumericPattern(numericPatterns.hour12h, string);

            case 'ho':
              return match.ordinalNumber(string, {
                unit: 'hour'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (_date, value, _options) {
          return value >= 1 && value <= 12;
        },
        set: function (date, _flags, value, _options) {
          var isPM = date.getUTCHours() >= 12;

          if (isPM && value < 12) {
            date.setUTCHours(value + 12, 0, 0, 0);
          } else if (!isPM && value === 12) {
            date.setUTCHours(0, 0, 0, 0);
          } else {
            date.setUTCHours(value, 0, 0, 0);
          }

          return date;
        },
        incompatibleTokens: ['H', 'K', 'k', 't', 'T']
      },
      // Hour [0-23]
      H: {
        priority: 70,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'H':
              return parseNumericPattern(numericPatterns.hour23h, string);

            case 'Ho':
              return match.ordinalNumber(string, {
                unit: 'hour'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 23;
        },
        set: function (date, _flags, value, _options) {
          date.setUTCHours(value, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['a', 'b', 'h', 'K', 'k', 't', 'T']
      },
      // Hour [0-11]
      K: {
        priority: 70,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'K':
              return parseNumericPattern(numericPatterns.hour11h, string);

            case 'Ko':
              return match.ordinalNumber(string, {
                unit: 'hour'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 11;
        },
        set: function (date, _flags, value, _options) {
          var isPM = date.getUTCHours() >= 12;

          if (isPM && value < 12) {
            date.setUTCHours(value + 12, 0, 0, 0);
          } else {
            date.setUTCHours(value, 0, 0, 0);
          }

          return date;
        },
        incompatibleTokens: ['a', 'b', 'h', 'H', 'k', 't', 'T']
      },
      // Hour [1-24]
      k: {
        priority: 70,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'k':
              return parseNumericPattern(numericPatterns.hour24h, string);

            case 'ko':
              return match.ordinalNumber(string, {
                unit: 'hour'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (_date, value, _options) {
          return value >= 1 && value <= 24;
        },
        set: function (date, _flags, value, _options) {
          var hours = value <= 24 ? value % 24 : value;
          date.setUTCHours(hours, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['a', 'b', 'h', 'H', 'K', 't', 'T']
      },
      // Minute
      m: {
        priority: 60,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'm':
              return parseNumericPattern(numericPatterns.minute, string);

            case 'mo':
              return match.ordinalNumber(string, {
                unit: 'minute'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 59;
        },
        set: function (date, _flags, value, _options) {
          date.setUTCMinutes(value, 0, 0);
          return date;
        },
        incompatibleTokens: ['t', 'T']
      },
      // Second
      s: {
        priority: 50,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 's':
              return parseNumericPattern(numericPatterns.second, string);

            case 'so':
              return match.ordinalNumber(string, {
                unit: 'second'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 59;
        },
        set: function (date, _flags, value, _options) {
          date.setUTCSeconds(value, 0);
          return date;
        },
        incompatibleTokens: ['t', 'T']
      },
      // Fraction of second
      S: {
        priority: 30,
        parse: function (string, token, _match, _options) {
          var valueCallback = function (value) {
            return Math.floor(value * Math.pow(10, -token.length + 3));
          };

          return parseNDigits(token.length, string, valueCallback);
        },
        set: function (date, _flags, value, _options) {
          date.setUTCMilliseconds(value);
          return date;
        },
        incompatibleTokens: ['t', 'T']
      },
      // Timezone (ISO-8601. +00:00 is `'Z'`)
      X: {
        priority: 10,
        parse: function (string, token, _match, _options) {
          switch (token) {
            case 'X':
              return parseTimezonePattern(timezonePatterns.basicOptionalMinutes, string);

            case 'XX':
              return parseTimezonePattern(timezonePatterns.basic, string);

            case 'XXXX':
              return parseTimezonePattern(timezonePatterns.basicOptionalSeconds, string);

            case 'XXXXX':
              return parseTimezonePattern(timezonePatterns.extendedOptionalSeconds, string);

            case 'XXX':
            default:
              return parseTimezonePattern(timezonePatterns.extended, string);
          }
        },
        set: function (date, flags, value, _options) {
          if (flags.timestampIsSet) {
            return date;
          }

          return new Date(date.getTime() - value);
        },
        incompatibleTokens: ['t', 'T', 'x']
      },
      // Timezone (ISO-8601)
      x: {
        priority: 10,
        parse: function (string, token, _match, _options) {
          switch (token) {
            case 'x':
              return parseTimezonePattern(timezonePatterns.basicOptionalMinutes, string);

            case 'xx':
              return parseTimezonePattern(timezonePatterns.basic, string);

            case 'xxxx':
              return parseTimezonePattern(timezonePatterns.basicOptionalSeconds, string);

            case 'xxxxx':
              return parseTimezonePattern(timezonePatterns.extendedOptionalSeconds, string);

            case 'xxx':
            default:
              return parseTimezonePattern(timezonePatterns.extended, string);
          }
        },
        set: function (date, flags, value, _options) {
          if (flags.timestampIsSet) {
            return date;
          }

          return new Date(date.getTime() - value);
        },
        incompatibleTokens: ['t', 'T', 'X']
      },
      // Seconds timestamp
      t: {
        priority: 40,
        parse: function (string, _token, _match, _options) {
          return parseAnyDigitsSigned(string);
        },
        set: function (_date, _flags, value, _options) {
          return [new Date(value * 1000), {
            timestampIsSet: true
          }];
        },
        incompatibleTokens: '*'
      },
      // Milliseconds timestamp
      T: {
        priority: 20,
        parse: function (string, _token, _match, _options) {
          return parseAnyDigitsSigned(string);
        },
        set: function (_date, _flags, value, _options) {
          return [new Date(value), {
            timestampIsSet: true
          }];
        },
        incompatibleTokens: '*'
      }
    };

    var TIMEZONE_UNIT_PRIORITY = 10; // This RegExp consists of three parts separated by `|`:
    // - [yYQqMLwIdDecihHKkms]o matches any available ordinal number token
    //   (one of the certain letters followed by `o`)
    // - (\w)\1* matches any sequences of the same letter
    // - '' matches two quote characters in a row
    // - '(''|[^'])+('|$) matches anything surrounded by two quote characters ('),
    //   except a single quote symbol, which ends the sequence.
    //   Two quote characters do not end the sequence.
    //   If there is no matching single quote
    //   then the sequence will continue until the end of the string.
    // - . matches any single character unmatched by previous parts of the RegExps

    var formattingTokensRegExp$1 = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g; // This RegExp catches symbols escaped by quotes, and also
    // sequences of symbols P, p, and the combinations like `PPPPPPPppppp`

    var longFormattingTokensRegExp$1 = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
    var escapedStringRegExp$1 = /^'([^]*?)'?$/;
    var doubleQuoteRegExp$1 = /''/g;
    var notWhitespaceRegExp = /\S/;
    var unescapedLatinCharacterRegExp$1 = /[a-zA-Z]/;
    /**
     * @name parse
     * @category Common Helpers
     * @summary Parse the date.
     *
     * @description
     * Return the date parsed from string using the given format string.
     *
     * > ⚠️ Please note that the `format` tokens differ from Moment.js and other libraries.
     * > See: https://git.io/fxCyr
     *
     * The characters in the format string wrapped between two single quotes characters (') are escaped.
     * Two single quotes in a row, whether inside or outside a quoted sequence, represent a 'real' single quote.
     *
     * Format of the format string is based on Unicode Technical Standard #35:
     * https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
     * with a few additions (see note 5 below the table).
     *
     * Not all tokens are compatible. Combinations that don't make sense or could lead to bugs are prohibited
     * and will throw `RangeError`. For example usage of 24-hour format token with AM/PM token will throw an exception:
     *
     * ```javascript
     * parse('23 AM', 'HH a', new Date())
     * //=> RangeError: The format string mustn't contain `HH` and `a` at the same time
     * ```
     *
     * See the compatibility table: https://docs.google.com/spreadsheets/d/e/2PACX-1vQOPU3xUhplll6dyoMmVUXHKl_8CRDs6_ueLmex3SoqwhuolkuN3O05l4rqx5h1dKX8eb46Ul-CCSrq/pubhtml?gid=0&single=true
     *
     * Accepted format string patterns:
     * | Unit                            |Prior| Pattern | Result examples                   | Notes |
     * |---------------------------------|-----|---------|-----------------------------------|-------|
     * | Era                             | 140 | G..GGG  | AD, BC                            |       |
     * |                                 |     | GGGG    | Anno Domini, Before Christ        | 2     |
     * |                                 |     | GGGGG   | A, B                              |       |
     * | Calendar year                   | 130 | y       | 44, 1, 1900, 2017, 9999           | 4     |
     * |                                 |     | yo      | 44th, 1st, 1900th, 9999999th      | 4,5   |
     * |                                 |     | yy      | 44, 01, 00, 17                    | 4     |
     * |                                 |     | yyy     | 044, 001, 123, 999                | 4     |
     * |                                 |     | yyyy    | 0044, 0001, 1900, 2017            | 4     |
     * |                                 |     | yyyyy   | ...                               | 2,4   |
     * | Local week-numbering year       | 130 | Y       | 44, 1, 1900, 2017, 9000           | 4     |
     * |                                 |     | Yo      | 44th, 1st, 1900th, 9999999th      | 4,5   |
     * |                                 |     | YY      | 44, 01, 00, 17                    | 4,6   |
     * |                                 |     | YYY     | 044, 001, 123, 999                | 4     |
     * |                                 |     | YYYY    | 0044, 0001, 1900, 2017            | 4,6   |
     * |                                 |     | YYYYY   | ...                               | 2,4   |
     * | ISO week-numbering year         | 130 | R       | -43, 1, 1900, 2017, 9999, -9999   | 4,5   |
     * |                                 |     | RR      | -43, 01, 00, 17                   | 4,5   |
     * |                                 |     | RRR     | -043, 001, 123, 999, -999         | 4,5   |
     * |                                 |     | RRRR    | -0043, 0001, 2017, 9999, -9999    | 4,5   |
     * |                                 |     | RRRRR   | ...                               | 2,4,5 |
     * | Extended year                   | 130 | u       | -43, 1, 1900, 2017, 9999, -999    | 4     |
     * |                                 |     | uu      | -43, 01, 99, -99                  | 4     |
     * |                                 |     | uuu     | -043, 001, 123, 999, -999         | 4     |
     * |                                 |     | uuuu    | -0043, 0001, 2017, 9999, -9999    | 4     |
     * |                                 |     | uuuuu   | ...                               | 2,4   |
     * | Quarter (formatting)            | 120 | Q       | 1, 2, 3, 4                        |       |
     * |                                 |     | Qo      | 1st, 2nd, 3rd, 4th                | 5     |
     * |                                 |     | QQ      | 01, 02, 03, 04                    |       |
     * |                                 |     | QQQ     | Q1, Q2, Q3, Q4                    |       |
     * |                                 |     | QQQQ    | 1st quarter, 2nd quarter, ...     | 2     |
     * |                                 |     | QQQQQ   | 1, 2, 3, 4                        | 4     |
     * | Quarter (stand-alone)           | 120 | q       | 1, 2, 3, 4                        |       |
     * |                                 |     | qo      | 1st, 2nd, 3rd, 4th                | 5     |
     * |                                 |     | qq      | 01, 02, 03, 04                    |       |
     * |                                 |     | qqq     | Q1, Q2, Q3, Q4                    |       |
     * |                                 |     | qqqq    | 1st quarter, 2nd quarter, ...     | 2     |
     * |                                 |     | qqqqq   | 1, 2, 3, 4                        | 3     |
     * | Month (formatting)              | 110 | M       | 1, 2, ..., 12                     |       |
     * |                                 |     | Mo      | 1st, 2nd, ..., 12th               | 5     |
     * |                                 |     | MM      | 01, 02, ..., 12                   |       |
     * |                                 |     | MMM     | Jan, Feb, ..., Dec                |       |
     * |                                 |     | MMMM    | January, February, ..., December  | 2     |
     * |                                 |     | MMMMM   | J, F, ..., D                      |       |
     * | Month (stand-alone)             | 110 | L       | 1, 2, ..., 12                     |       |
     * |                                 |     | Lo      | 1st, 2nd, ..., 12th               | 5     |
     * |                                 |     | LL      | 01, 02, ..., 12                   |       |
     * |                                 |     | LLL     | Jan, Feb, ..., Dec                |       |
     * |                                 |     | LLLL    | January, February, ..., December  | 2     |
     * |                                 |     | LLLLL   | J, F, ..., D                      |       |
     * | Local week of year              | 100 | w       | 1, 2, ..., 53                     |       |
     * |                                 |     | wo      | 1st, 2nd, ..., 53th               | 5     |
     * |                                 |     | ww      | 01, 02, ..., 53                   |       |
     * | ISO week of year                | 100 | I       | 1, 2, ..., 53                     | 5     |
     * |                                 |     | Io      | 1st, 2nd, ..., 53th               | 5     |
     * |                                 |     | II      | 01, 02, ..., 53                   | 5     |
     * | Day of month                    |  90 | d       | 1, 2, ..., 31                     |       |
     * |                                 |     | do      | 1st, 2nd, ..., 31st               | 5     |
     * |                                 |     | dd      | 01, 02, ..., 31                   |       |
     * | Day of year                     |  90 | D       | 1, 2, ..., 365, 366               | 7     |
     * |                                 |     | Do      | 1st, 2nd, ..., 365th, 366th       | 5     |
     * |                                 |     | DD      | 01, 02, ..., 365, 366             | 7     |
     * |                                 |     | DDD     | 001, 002, ..., 365, 366           |       |
     * |                                 |     | DDDD    | ...                               | 2     |
     * | Day of week (formatting)        |  90 | E..EEE  | Mon, Tue, Wed, ..., Sun           |       |
     * |                                 |     | EEEE    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 |     | EEEEE   | M, T, W, T, F, S, S               |       |
     * |                                 |     | EEEEEE  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | ISO day of week (formatting)    |  90 | i       | 1, 2, 3, ..., 7                   | 5     |
     * |                                 |     | io      | 1st, 2nd, ..., 7th                | 5     |
     * |                                 |     | ii      | 01, 02, ..., 07                   | 5     |
     * |                                 |     | iii     | Mon, Tue, Wed, ..., Sun           | 5     |
     * |                                 |     | iiii    | Monday, Tuesday, ..., Sunday      | 2,5   |
     * |                                 |     | iiiii   | M, T, W, T, F, S, S               | 5     |
     * |                                 |     | iiiiii  | Mo, Tu, We, Th, Fr, Su, Sa        | 5     |
     * | Local day of week (formatting)  |  90 | e       | 2, 3, 4, ..., 1                   |       |
     * |                                 |     | eo      | 2nd, 3rd, ..., 1st                | 5     |
     * |                                 |     | ee      | 02, 03, ..., 01                   |       |
     * |                                 |     | eee     | Mon, Tue, Wed, ..., Sun           |       |
     * |                                 |     | eeee    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 |     | eeeee   | M, T, W, T, F, S, S               |       |
     * |                                 |     | eeeeee  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | Local day of week (stand-alone) |  90 | c       | 2, 3, 4, ..., 1                   |       |
     * |                                 |     | co      | 2nd, 3rd, ..., 1st                | 5     |
     * |                                 |     | cc      | 02, 03, ..., 01                   |       |
     * |                                 |     | ccc     | Mon, Tue, Wed, ..., Sun           |       |
     * |                                 |     | cccc    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 |     | ccccc   | M, T, W, T, F, S, S               |       |
     * |                                 |     | cccccc  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | AM, PM                          |  80 | a..aaa  | AM, PM                            |       |
     * |                                 |     | aaaa    | a.m., p.m.                        | 2     |
     * |                                 |     | aaaaa   | a, p                              |       |
     * | AM, PM, noon, midnight          |  80 | b..bbb  | AM, PM, noon, midnight            |       |
     * |                                 |     | bbbb    | a.m., p.m., noon, midnight        | 2     |
     * |                                 |     | bbbbb   | a, p, n, mi                       |       |
     * | Flexible day period             |  80 | B..BBB  | at night, in the morning, ...     |       |
     * |                                 |     | BBBB    | at night, in the morning, ...     | 2     |
     * |                                 |     | BBBBB   | at night, in the morning, ...     |       |
     * | Hour [1-12]                     |  70 | h       | 1, 2, ..., 11, 12                 |       |
     * |                                 |     | ho      | 1st, 2nd, ..., 11th, 12th         | 5     |
     * |                                 |     | hh      | 01, 02, ..., 11, 12               |       |
     * | Hour [0-23]                     |  70 | H       | 0, 1, 2, ..., 23                  |       |
     * |                                 |     | Ho      | 0th, 1st, 2nd, ..., 23rd          | 5     |
     * |                                 |     | HH      | 00, 01, 02, ..., 23               |       |
     * | Hour [0-11]                     |  70 | K       | 1, 2, ..., 11, 0                  |       |
     * |                                 |     | Ko      | 1st, 2nd, ..., 11th, 0th          | 5     |
     * |                                 |     | KK      | 01, 02, ..., 11, 00               |       |
     * | Hour [1-24]                     |  70 | k       | 24, 1, 2, ..., 23                 |       |
     * |                                 |     | ko      | 24th, 1st, 2nd, ..., 23rd         | 5     |
     * |                                 |     | kk      | 24, 01, 02, ..., 23               |       |
     * | Minute                          |  60 | m       | 0, 1, ..., 59                     |       |
     * |                                 |     | mo      | 0th, 1st, ..., 59th               | 5     |
     * |                                 |     | mm      | 00, 01, ..., 59                   |       |
     * | Second                          |  50 | s       | 0, 1, ..., 59                     |       |
     * |                                 |     | so      | 0th, 1st, ..., 59th               | 5     |
     * |                                 |     | ss      | 00, 01, ..., 59                   |       |
     * | Seconds timestamp               |  40 | t       | 512969520                         |       |
     * |                                 |     | tt      | ...                               | 2     |
     * | Fraction of second              |  30 | S       | 0, 1, ..., 9                      |       |
     * |                                 |     | SS      | 00, 01, ..., 99                   |       |
     * |                                 |     | SSS     | 000, 0001, ..., 999               |       |
     * |                                 |     | SSSS    | ...                               | 2     |
     * | Milliseconds timestamp          |  20 | T       | 512969520900                      |       |
     * |                                 |     | TT      | ...                               | 2     |
     * | Timezone (ISO-8601 w/ Z)        |  10 | X       | -08, +0530, Z                     |       |
     * |                                 |     | XX      | -0800, +0530, Z                   |       |
     * |                                 |     | XXX     | -08:00, +05:30, Z                 |       |
     * |                                 |     | XXXX    | -0800, +0530, Z, +123456          | 2     |
     * |                                 |     | XXXXX   | -08:00, +05:30, Z, +12:34:56      |       |
     * | Timezone (ISO-8601 w/o Z)       |  10 | x       | -08, +0530, +00                   |       |
     * |                                 |     | xx      | -0800, +0530, +0000               |       |
     * |                                 |     | xxx     | -08:00, +05:30, +00:00            | 2     |
     * |                                 |     | xxxx    | -0800, +0530, +0000, +123456      |       |
     * |                                 |     | xxxxx   | -08:00, +05:30, +00:00, +12:34:56 |       |
     * | Long localized date             |  NA | P       | 05/29/1453                        | 5,8   |
     * |                                 |     | PP      | May 29, 1453                      |       |
     * |                                 |     | PPP     | May 29th, 1453                    |       |
     * |                                 |     | PPPP    | Sunday, May 29th, 1453            | 2,5,8 |
     * | Long localized time             |  NA | p       | 12:00 AM                          | 5,8   |
     * |                                 |     | pp      | 12:00:00 AM                       |       |
     * | Combination of date and time    |  NA | Pp      | 05/29/1453, 12:00 AM              |       |
     * |                                 |     | PPpp    | May 29, 1453, 12:00:00 AM         |       |
     * |                                 |     | PPPpp   | May 29th, 1453 at ...             |       |
     * |                                 |     | PPPPpp  | Sunday, May 29th, 1453 at ...     | 2,5,8 |
     * Notes:
     * 1. "Formatting" units (e.g. formatting quarter) in the default en-US locale
     *    are the same as "stand-alone" units, but are different in some languages.
     *    "Formatting" units are declined according to the rules of the language
     *    in the context of a date. "Stand-alone" units are always nominative singular.
     *    In `format` function, they will produce different result:
     *
     *    `format(new Date(2017, 10, 6), 'do LLLL', {locale: cs}) //=> '6. listopad'`
     *
     *    `format(new Date(2017, 10, 6), 'do MMMM', {locale: cs}) //=> '6. listopadu'`
     *
     *    `parse` will try to match both formatting and stand-alone units interchangably.
     *
     * 2. Any sequence of the identical letters is a pattern, unless it is escaped by
     *    the single quote characters (see below).
     *    If the sequence is longer than listed in table:
     *    - for numerical units (`yyyyyyyy`) `parse` will try to match a number
     *      as wide as the sequence
     *    - for text units (`MMMMMMMM`) `parse` will try to match the widest variation of the unit.
     *      These variations are marked with "2" in the last column of the table.
     *
     * 3. `QQQQQ` and `qqqqq` could be not strictly numerical in some locales.
     *    These tokens represent the shortest form of the quarter.
     *
     * 4. The main difference between `y` and `u` patterns are B.C. years:
     *
     *    | Year | `y` | `u` |
     *    |------|-----|-----|
     *    | AC 1 |   1 |   1 |
     *    | BC 1 |   1 |   0 |
     *    | BC 2 |   2 |  -1 |
     *
     *    Also `yy` will try to guess the century of two digit year by proximity with `referenceDate`:
     *
     *    `parse('50', 'yy', new Date(2018, 0, 1)) //=> Sat Jan 01 2050 00:00:00`
     *
     *    `parse('75', 'yy', new Date(2018, 0, 1)) //=> Wed Jan 01 1975 00:00:00`
     *
     *    while `uu` will just assign the year as is:
     *
     *    `parse('50', 'uu', new Date(2018, 0, 1)) //=> Sat Jan 01 0050 00:00:00`
     *
     *    `parse('75', 'uu', new Date(2018, 0, 1)) //=> Tue Jan 01 0075 00:00:00`
     *
     *    The same difference is true for local and ISO week-numbering years (`Y` and `R`),
     *    except local week-numbering years are dependent on `options.weekStartsOn`
     *    and `options.firstWeekContainsDate` (compare [setISOWeekYear]{@link https://date-fns.org/docs/setISOWeekYear}
     *    and [setWeekYear]{@link https://date-fns.org/docs/setWeekYear}).
     *
     * 5. These patterns are not in the Unicode Technical Standard #35:
     *    - `i`: ISO day of week
     *    - `I`: ISO week of year
     *    - `R`: ISO week-numbering year
     *    - `o`: ordinal number modifier
     *    - `P`: long localized date
     *    - `p`: long localized time
     *
     * 6. `YY` and `YYYY` tokens represent week-numbering years but they are often confused with years.
     *    You should enable `options.useAdditionalWeekYearTokens` to use them. See: https://git.io/fxCyr
     *
     * 7. `D` and `DD` tokens represent days of the year but they are ofthen confused with days of the month.
     *    You should enable `options.useAdditionalDayOfYearTokens` to use them. See: https://git.io/fxCyr
     *
     * 8. `P+` tokens do not have a defined priority since they are merely aliases to other tokens based
     *    on the given locale.
     *
     *    using `en-US` locale: `P` => `MM/dd/yyyy`
     *    using `en-US` locale: `p` => `hh:mm a`
     *    using `pt-BR` locale: `P` => `dd/MM/yyyy`
     *    using `pt-BR` locale: `p` => `HH:mm`
     *
     * Values will be assigned to the date in the descending order of its unit's priority.
     * Units of an equal priority overwrite each other in the order of appearance.
     *
     * If no values of higher priority are parsed (e.g. when parsing string 'January 1st' without a year),
     * the values will be taken from 3rd argument `referenceDate` which works as a context of parsing.
     *
     * `referenceDate` must be passed for correct work of the function.
     * If you're not sure which `referenceDate` to supply, create a new instance of Date:
     * `parse('02/11/2014', 'MM/dd/yyyy', new Date())`
     * In this case parsing will be done in the context of the current date.
     * If `referenceDate` is `Invalid Date` or a value not convertible to valid `Date`,
     * then `Invalid Date` will be returned.
     *
     * The result may vary by locale.
     *
     * If `formatString` matches with `dateString` but does not provides tokens, `referenceDate` will be returned.
     *
     * If parsing failed, `Invalid Date` will be returned.
     * Invalid Date is a Date, whose time value is NaN.
     * Time value of Date: http://es5.github.io/#x15.9.1.1
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * - Old `parse` was renamed to `toDate`.
     *   Now `parse` is a new function which parses a string using a provided format.
     *
     *   ```javascript
     *   // Before v2.0.0
     *   parse('2016-01-01')
     *
     *   // v2.0.0 onward
     *   toDate('2016-01-01')
     *   parse('2016-01-01', 'yyyy-MM-dd', new Date())
     *   ```
     *
     * @param {String} dateString - the string to parse
     * @param {String} formatString - the string of tokens
     * @param {Date|Number} referenceDate - defines values missing from the parsed dateString
     * @param {Object} [options] - an object with options.
     * @param {Locale} [options.locale=defaultLocale] - the locale object. See [Locale]{@link https://date-fns.org/docs/Locale}
     * @param {0|1|2|3|4|5|6} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
     * @param {1|2|3|4|5|6|7} [options.firstWeekContainsDate=1] - the day of January, which is always in the first week of the year
     * @param {Boolean} [options.useAdditionalWeekYearTokens=false] - if true, allows usage of the week-numbering year tokens `YY` and `YYYY`;
     *   see: https://git.io/fxCyr
     * @param {Boolean} [options.useAdditionalDayOfYearTokens=false] - if true, allows usage of the day of year tokens `D` and `DD`;
     *   see: https://git.io/fxCyr
     * @returns {Date} the parsed date
     * @throws {TypeError} 3 arguments required
     * @throws {RangeError} `options.weekStartsOn` must be between 0 and 6
     * @throws {RangeError} `options.firstWeekContainsDate` must be between 1 and 7
     * @throws {RangeError} `options.locale` must contain `match` property
     * @throws {RangeError} use `yyyy` instead of `YYYY` for formatting years using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} use `yy` instead of `YY` for formatting years using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} use `d` instead of `D` for formatting days of the month using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} use `dd` instead of `DD` for formatting days of the month using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} format string contains an unescaped latin alphabet character
     *
     * @example
     * // Parse 11 February 2014 from middle-endian format:
     * var result = parse('02/11/2014', 'MM/dd/yyyy', new Date())
     * //=> Tue Feb 11 2014 00:00:00
     *
     * @example
     * // Parse 28th of February in Esperanto locale in the context of 2010 year:
     * import eo from 'date-fns/locale/eo'
     * var result = parse('28-a de februaro', "do 'de' MMMM", new Date(2010, 0, 1), {
     *   locale: eo
     * })
     * //=> Sun Feb 28 2010 00:00:00
     */

    function parse(dirtyDateString, dirtyFormatString, dirtyReferenceDate, dirtyOptions) {
      requiredArgs(3, arguments);
      var dateString = String(dirtyDateString);
      var formatString = String(dirtyFormatString);
      var options = dirtyOptions || {};
      var locale$1 = options.locale || locale;

      if (!locale$1.match) {
        throw new RangeError('locale must contain match property');
      }

      var localeFirstWeekContainsDate = locale$1.options && locale$1.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate); // Test if weekStartsOn is between 1 and 7 _and_ is not NaN

      if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
        throw new RangeError('firstWeekContainsDate must be between 1 and 7 inclusively');
      }

      var localeWeekStartsOn = locale$1.options && locale$1.options.weekStartsOn;
      var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
      var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
        throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }

      if (formatString === '') {
        if (dateString === '') {
          return toDate(dirtyReferenceDate);
        } else {
          return new Date(NaN);
        }
      }

      var subFnOptions = {
        firstWeekContainsDate: firstWeekContainsDate,
        weekStartsOn: weekStartsOn,
        locale: locale$1 // If timezone isn't specified, it will be set to the system timezone

      };
      var setters = [{
        priority: TIMEZONE_UNIT_PRIORITY,
        subPriority: -1,
        set: dateToSystemTimezone,
        index: 0
      }];
      var i;
      var tokens = formatString.match(longFormattingTokensRegExp$1).map(function (substring) {
        var firstCharacter = substring[0];

        if (firstCharacter === 'p' || firstCharacter === 'P') {
          var longFormatter = longFormatters[firstCharacter];
          return longFormatter(substring, locale$1.formatLong, subFnOptions);
        }

        return substring;
      }).join('').match(formattingTokensRegExp$1);
      var usedTokens = [];

      for (i = 0; i < tokens.length; i++) {
        var token = tokens[i];

        if (!options.useAdditionalWeekYearTokens && isProtectedWeekYearToken(token)) {
          throwProtectedError(token, formatString, dirtyDateString);
        }

        if (!options.useAdditionalDayOfYearTokens && isProtectedDayOfYearToken(token)) {
          throwProtectedError(token, formatString, dirtyDateString);
        }

        var firstCharacter = token[0];
        var parser = parsers[firstCharacter];

        if (parser) {
          var incompatibleTokens = parser.incompatibleTokens;

          if (Array.isArray(incompatibleTokens)) {
            var incompatibleToken = void 0;

            for (var _i = 0; _i < usedTokens.length; _i++) {
              var usedToken = usedTokens[_i].token;

              if (incompatibleTokens.indexOf(usedToken) !== -1 || usedToken === firstCharacter) {
                incompatibleToken = usedTokens[_i];
                break;
              }
            }

            if (incompatibleToken) {
              throw new RangeError("The format string mustn't contain `".concat(incompatibleToken.fullToken, "` and `").concat(token, "` at the same time"));
            }
          } else if (parser.incompatibleTokens === '*' && usedTokens.length) {
            throw new RangeError("The format string mustn't contain `".concat(token, "` and any other token at the same time"));
          }

          usedTokens.push({
            token: firstCharacter,
            fullToken: token
          });
          var parseResult = parser.parse(dateString, token, locale$1.match, subFnOptions);

          if (!parseResult) {
            return new Date(NaN);
          }

          setters.push({
            priority: parser.priority,
            subPriority: parser.subPriority || 0,
            set: parser.set,
            validate: parser.validate,
            value: parseResult.value,
            index: setters.length
          });
          dateString = parseResult.rest;
        } else {
          if (firstCharacter.match(unescapedLatinCharacterRegExp$1)) {
            throw new RangeError('Format string contains an unescaped latin alphabet character `' + firstCharacter + '`');
          } // Replace two single quote characters with one single quote character


          if (token === "''") {
            token = "'";
          } else if (firstCharacter === "'") {
            token = cleanEscapedString$1(token);
          } // Cut token from string, or, if string doesn't match the token, return Invalid Date


          if (dateString.indexOf(token) === 0) {
            dateString = dateString.slice(token.length);
          } else {
            return new Date(NaN);
          }
        }
      } // Check if the remaining input contains something other than whitespace


      if (dateString.length > 0 && notWhitespaceRegExp.test(dateString)) {
        return new Date(NaN);
      }

      var uniquePrioritySetters = setters.map(function (setter) {
        return setter.priority;
      }).sort(function (a, b) {
        return b - a;
      }).filter(function (priority, index, array) {
        return array.indexOf(priority) === index;
      }).map(function (priority) {
        return setters.filter(function (setter) {
          return setter.priority === priority;
        }).sort(function (a, b) {
          return b.subPriority - a.subPriority;
        });
      }).map(function (setterArray) {
        return setterArray[0];
      });
      var date = toDate(dirtyReferenceDate);

      if (isNaN(date)) {
        return new Date(NaN);
      } // Convert the date in system timezone to the same date in UTC+00:00 timezone.
      // This ensures that when UTC functions will be implemented, locales will be compatible with them.
      // See an issue about UTC functions: https://github.com/date-fns/date-fns/issues/37


      var utcDate = subMilliseconds(date, getTimezoneOffsetInMilliseconds(date));
      var flags = {};

      for (i = 0; i < uniquePrioritySetters.length; i++) {
        var setter = uniquePrioritySetters[i];

        if (setter.validate && !setter.validate(utcDate, setter.value, subFnOptions)) {
          return new Date(NaN);
        }

        var result = setter.set(utcDate, flags, setter.value, subFnOptions); // Result is tuple (date, flags)

        if (result[0]) {
          utcDate = result[0];
          assign(flags, result[1]); // Result is date
        } else {
          utcDate = result;
        }
      }

      return utcDate;
    }

    function dateToSystemTimezone(date, flags) {
      if (flags.timestampIsSet) {
        return date;
      }

      var convertedDate = new Date(0);
      convertedDate.setFullYear(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      convertedDate.setHours(date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());
      return convertedDate;
    }

    function cleanEscapedString$1(input) {
      return input.match(escapedStringRegExp$1)[1].replace(doubleQuoteRegExp$1, "'");
    }

    /**
     * @name lastDayOfYear
     * @category Year Helpers
     * @summary Return the last day of a year for the given date.
     *
     * @description
     * Return the last day of a year for the given date.
     * The result will be in the local timezone.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the original date
     * @returns {Date} the last day of a year
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // The last day of a year for 2 September 2014 11:55:00:
     * var result = lastDayOfYear(new Date(2014, 8, 2, 11, 55, 00))
     * //=> Wed Dec 31 2014 00:00:00
     */

    function lastDayOfYear(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var year = date.getFullYear();
      date.setFullYear(year + 1, 0, 0);
      date.setHours(0, 0, 0, 0);
      return date;
    }

    /**
     * @name setMonth
     * @category Month Helpers
     * @summary Set the month to the given date.
     *
     * @description
     * Set the month to the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} month - the month of the new date
     * @returns {Date} the new date with the month set
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Set February to 1 September 2014:
     * var result = setMonth(new Date(2014, 8, 1), 1)
     * //=> Sat Feb 01 2014 00:00:00
     */

    function setMonth(dirtyDate, dirtyMonth) {
      requiredArgs(2, arguments);
      var date = toDate(dirtyDate);
      var month = toInteger(dirtyMonth);
      var year = date.getFullYear();
      var day = date.getDate();
      var dateWithDesiredMonth = new Date(0);
      dateWithDesiredMonth.setFullYear(year, month, 15);
      dateWithDesiredMonth.setHours(0, 0, 0, 0);
      var daysInMonth = getDaysInMonth(dateWithDesiredMonth); // Set the last day of the new month
      // if the original date was the last day of the longer month

      date.setMonth(month, Math.min(day, daysInMonth));
      return date;
    }

    /**
     * @name set
     * @category Common Helpers
     * @summary Set date values to a given date.
     *
     * @description
     * Set date values to a given date.
     *
     * Sets time values to date from object `values`.
     * A value is not set if it is undefined or null or doesn't exist in `values`.
     *
     * Note about bundle size: `set` does not internally use `setX` functions from date-fns but instead opts
     * to use native `Date#setX` methods. If you use this function, you may not want to include the
     * other `setX` functions that date-fns provides if you are concerned about the bundle size.
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Object} values - an object with options
     * @param {Number} [values.year] - the number of years to be set
     * @param {Number} [values.month] - the number of months to be set
     * @param {Number} [values.date] - the number of days to be set
     * @param {Number} [values.hours] - the number of hours to be set
     * @param {Number} [values.minutes] - the number of minutes to be set
     * @param {Number} [values.seconds] - the number of seconds to be set
     * @param {Number} [values.milliseconds] - the number of milliseconds to be set
     * @returns {Date} the new date with options set
     * @throws {TypeError} 2 arguments required
     * @throws {RangeError} `values` must be an object
     *
     * @example
     * // Transform 1 September 2014 into 20 October 2015 in a single line:
     * var result = set(new Date(2014, 8, 20), { year: 2015, month: 9, date: 20 })
     * //=> Tue Oct 20 2015 00:00:00
     *
     * @example
     * // Set 12 PM to 1 September 2014 01:23:45 to 1 September 2014 12:00:00:
     * var result = set(new Date(2014, 8, 1, 1, 23, 45), { hours: 12 })
     * //=> Mon Sep 01 2014 12:23:45
     */

    function set(dirtyDate, values) {
      requiredArgs(2, arguments);

      if (typeof values !== 'object' || values === null) {
        throw new RangeError('values parameter must be an object');
      }

      var date = toDate(dirtyDate); // Check if date is Invalid Date because Date.prototype.setFullYear ignores the value of Invalid Date

      if (isNaN(date)) {
        return new Date(NaN);
      }

      if (values.year != null) {
        date.setFullYear(values.year);
      }

      if (values.month != null) {
        date = setMonth(date, values.month);
      }

      if (values.date != null) {
        date.setDate(toInteger(values.date));
      }

      if (values.hours != null) {
        date.setHours(toInteger(values.hours));
      }

      if (values.minutes != null) {
        date.setMinutes(toInteger(values.minutes));
      }

      if (values.seconds != null) {
        date.setSeconds(toInteger(values.seconds));
      }

      if (values.milliseconds != null) {
        date.setMilliseconds(toInteger(values.milliseconds));
      }

      return date;
    }

    /**
     * @name setDate
     * @category Day Helpers
     * @summary Set the day of the month to the given date.
     *
     * @description
     * Set the day of the month to the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} dayOfMonth - the day of the month of the new date
     * @returns {Date} the new date with the day of the month set
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Set the 30th day of the month to 1 September 2014:
     * var result = setDate(new Date(2014, 8, 1), 30)
     * //=> Tue Sep 30 2014 00:00:00
     */

    function setDate(dirtyDate, dirtyDayOfMonth) {
      requiredArgs(2, arguments);
      var date = toDate(dirtyDate);
      var dayOfMonth = toInteger(dirtyDayOfMonth);
      date.setDate(dayOfMonth);
      return date;
    }

    /* src/DayBoxOrg.svelte generated by Svelte v3.30.0 */

    const file = "src/DayBoxOrg.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	child_ctx[12] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    // (130:8) {#if organizer.city}
    function create_if_block_1(ctx) {
    	let t0;
    	let t1_value = /*organizer*/ ctx[0].city + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			t0 = text("(");
    			t1 = text(t1_value);
    			t2 = text(")");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*organizer*/ 1 && t1_value !== (t1_value = /*organizer*/ ctx[0].city + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(130:8) {#if organizer.city}",
    		ctx
    	});

    	return block;
    }

    // (135:16) {#each Array.from(judges) as judge}
    function create_each_block_1(ctx) {
    	let div;
    	let t_value = /*judge*/ ctx[13] + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			add_location(div, file, 135, 20, 3651);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(135:16) {#each Array.from(judges) as judge}",
    		ctx
    	});

    	return block;
    }

    // (146:12) {#if str}
    function create_if_block(ctx) {
    	let div;
    	let t0_value = /*str*/ ctx[10] + "";
    	let t0;
    	let t1;
    	let span;
    	let t2_value = /*LEVELS*/ ctx[1][/*i*/ ctx[12]] + "";
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			span = element("span");
    			t2 = text(t2_value);
    			attr_dev(span, "class", "level-indicator");
    			add_location(span, file, 146, 48, 3999);
    			attr_dev(div, "class", "class-counts svelte-1lct74w");
    			add_location(div, file, 146, 16, 3967);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, span);
    			append_dev(span, t2);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(146:12) {#if str}",
    		ctx
    	});

    	return block;
    }

    // (145:8) {#each classStrings as str, i}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*str*/ ctx[10] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*str*/ ctx[10]) if_block.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(145:8) {#each classStrings as str, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div7;
    	let div0;
    	let t1;
    	let div1;
    	let abbr;
    	let t2_value = /*organizer*/ ctx[0].abbr + "";
    	let t2;
    	let abbr_title_value;
    	let t3;
    	let t4;
    	let div5;
    	let div4;
    	let div2;
    	let t5;
    	let div3;
    	let t7;
    	let div6;
    	let if_block = /*organizer*/ ctx[0].city && create_if_block_1(ctx);
    	let each_value_1 = Array.from(/*judges*/ ctx[2]);
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*classStrings*/ ctx[5];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div0 = element("div");
    			div0.textContent = "Varaus";
    			t1 = space();
    			div1 = element("div");
    			abbr = element("abbr");
    			t2 = text(t2_value);
    			t3 = space();
    			if (if_block) if_block.c();
    			t4 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div2 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t5 = space();
    			div3 = element("div");
    			div3.textContent = `${Array.from(/*reserveJudges*/ ctx[3]).join(", ")}`;
    			t7 = space();
    			div6 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "state svelte-1lct74w");
    			attr_dev(div0, "title", "Kilpailua ei ole vielä myönnetty");
    			add_location(div0, file, 126, 4, 3258);
    			attr_dev(abbr, "title", abbr_title_value = /*organizer*/ ctx[0].name);
    			attr_dev(abbr, "class", "svelte-1lct74w");
    			add_location(abbr, file, 128, 8, 3377);
    			attr_dev(div1, "class", "organizer-container svelte-1lct74w");
    			add_location(div1, file, 127, 4, 3335);
    			attr_dev(div2, "class", "judges-main svelte-1lct74w");
    			add_location(div2, file, 133, 12, 3553);
    			attr_dev(div3, "class", "judges-reserve svelte-1lct74w");
    			add_location(div3, file, 138, 12, 3725);
    			add_location(div4, file, 132, 8, 3535);
    			attr_dev(div5, "class", "names-container svelte-1lct74w");
    			add_location(div5, file, 131, 4, 3497);
    			attr_dev(div6, "class", "classes-container svelte-1lct74w");
    			add_location(div6, file, 143, 4, 3858);
    			attr_dev(div7, "class", "base svelte-1lct74w");
    			toggle_class(div7, "draft", /*status*/ ctx[4] !== "SAGI_APPROVED");
    			add_location(div7, file, 125, 0, 3194);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div0);
    			append_dev(div7, t1);
    			append_dev(div7, div1);
    			append_dev(div1, abbr);
    			append_dev(abbr, t2);
    			append_dev(div1, t3);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div7, t4);
    			append_dev(div7, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div2);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div2, null);
    			}

    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div7, t7);
    			append_dev(div7, div6);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div6, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*organizer*/ 1 && t2_value !== (t2_value = /*organizer*/ ctx[0].abbr + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*organizer*/ 1 && abbr_title_value !== (abbr_title_value = /*organizer*/ ctx[0].name)) {
    				attr_dev(abbr, "title", abbr_title_value);
    			}

    			if (/*organizer*/ ctx[0].city) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*Array, judges*/ 4) {
    				each_value_1 = Array.from(/*judges*/ ctx[2]);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*LEVELS, classStrings*/ 34) {
    				each_value = /*classStrings*/ ctx[5];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div6, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*status*/ 16) {
    				toggle_class(div7, "draft", /*status*/ ctx[4] !== "SAGI_APPROVED");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayBoxOrg", slots, []);
    	var _a;
    	
    	let { organizer } = $$props;
    	let { tracks } = $$props;
    	const LEVELS = ["1", "2", "3", "X"];
    	const SIZES = ["XS", "S", "M", "SL", "L"];
    	const judges = new Set();
    	const reserveJudges = new Set();
    	const counts = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];

    	let status = (_a = tracks[0]) === null || _a === void 0
    	? void 0
    	: _a.details.state;

    	for (const track of tracks) {
    		const levelIndex = LEVELS.indexOf(track.level);
    		const sizeIndex = SIZES.indexOf(track.size);
    		counts[levelIndex][sizeIndex] += 1;

    		if (track.mainJudge) {
    			judges.add(track.mainJudge);
    		}

    		if (track.reserveJudge) {
    			reserveJudges.add(track.reserveJudge);
    		}
    	}

    	for (const judge of judges) {
    		reserveJudges.delete(judge);
    	}

    	// const totalCounts = counts.map((level) => {
    	//     const allCount = Math.min(...level);
    	//     return [allCount, ...level.map((c) => c - allCount)];
    	// });
    	const classStrings = counts.map(levels => {
    		const [sizeStr, acc] = levels.reduce(
    			([out, acc], cl, s) => {
    				if (!cl) {
    					if (acc.length < 2) {
    						return [[out, ...acc].join(", "), []];
    					} else return [
    						out
    						? `${out}, ${acc[0]}-${acc[1]}`
    						: `${acc[0]}-${acc[1]}`,
    						[]
    					];
    				}

    				if (acc.length < 2) return [out, [...acc, SIZES[s]]];
    				return [out, [acc[0], SIZES[s]]];
    			},
    			[,[]]
    		);

    		if (sizeStr) {
    			return acc.length < 2
    			? [sizeStr, ...acc].join(", ")
    			: `${sizeStr}, ${acc[0]}-${acc[1]}`;
    		}

    		return acc.length < 2 ? acc.join("") : `${acc[0]}-${acc[1]}`;
    	});

    	const writable_props = ["organizer", "tracks"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayBoxOrg> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("organizer" in $$props) $$invalidate(0, organizer = $$props.organizer);
    		if ("tracks" in $$props) $$invalidate(6, tracks = $$props.tracks);
    	};

    	$$self.$capture_state = () => ({
    		_a,
    		organizer,
    		tracks,
    		LEVELS,
    		SIZES,
    		judges,
    		reserveJudges,
    		counts,
    		status,
    		classStrings
    	});

    	$$self.$inject_state = $$props => {
    		if ("_a" in $$props) _a = $$props._a;
    		if ("organizer" in $$props) $$invalidate(0, organizer = $$props.organizer);
    		if ("tracks" in $$props) $$invalidate(6, tracks = $$props.tracks);
    		if ("status" in $$props) $$invalidate(4, status = $$props.status);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [organizer, LEVELS, judges, reserveJudges, status, classStrings, tracks];
    }

    class DayBoxOrg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { organizer: 0, tracks: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayBoxOrg",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*organizer*/ ctx[0] === undefined && !("organizer" in props)) {
    			console.warn("<DayBoxOrg> was created without expected prop 'organizer'");
    		}

    		if (/*tracks*/ ctx[6] === undefined && !("tracks" in props)) {
    			console.warn("<DayBoxOrg> was created without expected prop 'tracks'");
    		}
    	}

    	get organizer() {
    		throw new Error("<DayBoxOrg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set organizer(value) {
    		throw new Error("<DayBoxOrg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tracks() {
    		throw new Error("<DayBoxOrg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tracks(value) {
    		throw new Error("<DayBoxOrg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function futureSeconds(text) {
      return text.replace(/sekuntia?/, 'sekunnin');
    }

    function futureMinutes(text) {
      return text.replace(/minuuttia?/, 'minuutin');
    }

    function futureHours(text) {
      return text.replace(/tuntia?/, 'tunnin');
    }

    function futureDays(text) {
      return text.replace(/päivää?/, 'päivän');
    }

    function futureWeeks(text) {
      return text.replace(/(viikko|viikkoa)/, 'viikon');
    }

    function futureMonths(text) {
      return text.replace(/(kuukausi|kuukautta)/, 'kuukauden');
    }

    function futureYears(text) {
      return text.replace(/(vuosi|vuotta)/, 'vuoden');
    }

    var formatDistanceLocale$1 = {
      lessThanXSeconds: {
        one: 'alle sekunti',
        other: 'alle {{count}} sekuntia',
        futureTense: futureSeconds
      },
      xSeconds: {
        one: 'sekunti',
        other: '{{count}} sekuntia',
        futureTense: futureSeconds
      },
      halfAMinute: {
        one: 'puoli minuuttia',
        other: 'puoli minuuttia',
        futureTense: function (_text) {
          return 'puolen minuutin';
        }
      },
      lessThanXMinutes: {
        one: 'alle minuutti',
        other: 'alle {{count}} minuuttia',
        futureTense: futureMinutes
      },
      xMinutes: {
        one: 'minuutti',
        other: '{{count}} minuuttia',
        futureTense: futureMinutes
      },
      aboutXHours: {
        one: 'noin tunti',
        other: 'noin {{count}} tuntia',
        futureTense: futureHours
      },
      xHours: {
        one: 'tunti',
        other: '{{count}} tuntia',
        futureTense: futureHours
      },
      xDays: {
        one: 'päivä',
        other: '{{count}} päivää',
        futureTense: futureDays
      },
      aboutXWeeks: {
        one: 'noin viikko',
        other: 'noin {{count}} viikkoa',
        futureTense: futureWeeks
      },
      xWeeks: {
        one: 'viikko',
        other: '{{count}} viikkoa',
        futureTense: futureWeeks
      },
      aboutXMonths: {
        one: 'noin kuukausi',
        other: 'noin {{count}} kuukautta',
        futureTense: futureMonths
      },
      xMonths: {
        one: 'kuukausi',
        other: '{{count}} kuukautta',
        futureTense: futureMonths
      },
      aboutXYears: {
        one: 'noin vuosi',
        other: 'noin {{count}} vuotta',
        futureTense: futureYears
      },
      xYears: {
        one: 'vuosi',
        other: '{{count}} vuotta',
        futureTense: futureYears
      },
      overXYears: {
        one: 'yli vuosi',
        other: 'yli {{count}} vuotta',
        futureTense: futureYears
      },
      almostXYears: {
        one: 'lähes vuosi',
        other: 'lähes {{count}} vuotta',
        futureTense: futureYears
      }
    };
    function formatDistance$1(token, count, options) {
      options = options || {};
      var distance = formatDistanceLocale$1[token];
      var result = count === 1 ? distance.one : distance.other.replace('{{count}}', count);

      if (options.addSuffix) {
        if (options.comparison > 0) {
          return distance.futureTense(result) + ' kuluttua';
        } else {
          return result + ' sitten';
        }
      }

      return result;
    }

    var dateFormats$1 = {
      full: 'eeee d. MMMM y',
      long: 'd. MMMM y',
      medium: 'd. MMM y',
      short: 'd.M.y'
    };
    var timeFormats$1 = {
      full: 'HH.mm.ss zzzz',
      long: 'HH.mm.ss z',
      medium: 'HH.mm.ss',
      short: 'HH.mm'
    };
    var dateTimeFormats$1 = {
      full: "{{date}} 'klo' {{time}}",
      long: "{{date}} 'klo' {{time}}",
      medium: '{{date}} {{time}}',
      short: '{{date}} {{time}}'
    };
    var formatLong$1 = {
      date: buildFormatLongFn({
        formats: dateFormats$1,
        defaultWidth: 'full'
      }),
      time: buildFormatLongFn({
        formats: timeFormats$1,
        defaultWidth: 'full'
      }),
      dateTime: buildFormatLongFn({
        formats: dateTimeFormats$1,
        defaultWidth: 'full'
      })
    };

    var formatRelativeLocale$1 = {
      lastWeek: "'viime' eeee 'klo' p",
      yesterday: "'eilen klo' p",
      today: "'tänään klo' p",
      tomorrow: "'huomenna klo' p",
      nextWeek: "'ensi' eeee 'klo' p",
      other: 'P'
    };
    function formatRelative$1(token, _date, _baseDate, _options) {
      return formatRelativeLocale$1[token];
    }

    var eraValues$1 = {
      narrow: ['eaa.', 'jaa.'],
      abbreviated: ['eaa.', 'jaa.'],
      wide: ['ennen ajanlaskun alkua', 'jälkeen ajanlaskun alun']
    };
    var quarterValues$1 = {
      narrow: ['1', '2', '3', '4'],
      abbreviated: ['Q1', 'Q2', 'Q3', 'Q4'],
      wide: ['1. kvartaali', '2. kvartaali', '3. kvartaali', '4. kvartaali']
    };
    var monthValues$1 = {
      narrow: ['T', 'H', 'M', 'H', 'T', 'K', 'H', 'E', 'S', 'L', 'M', 'J'],
      abbreviated: ['tammi', 'helmi', 'maalis', 'huhti', 'touko', 'kesä', 'heinä', 'elo', 'syys', 'loka', 'marras', 'joulu'],
      wide: ['tammikuu', 'helmikuu', 'maaliskuu', 'huhtikuu', 'toukokuu', 'kesäkuu', 'heinäkuu', 'elokuu', 'syyskuu', 'lokakuu', 'marraskuu', 'joulukuu']
    };
    var formattingMonthValues = {
      narrow: monthValues$1.narrow,
      abbreviated: monthValues$1.abbreviated,
      wide: monthValues$1.wide.map(function (name) {
        return name + 'ta';
      })
    };
    var dayValues$1 = {
      narrow: ['S', 'M', 'T', 'K', 'T', 'P', 'L'],
      short: ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'],
      abbreviated: ['sunn.', 'maan.', 'tiis.', 'kesk.', 'torst.', 'perj.', 'la'],
      wide: ['sunnuntai', 'maanantai', 'tiistai', 'keskiviikko', 'torstai', 'perjantai', 'lauantai']
    };
    var formattingDayValues = {
      narrow: dayValues$1.narrow,
      short: dayValues$1.short,
      abbreviated: dayValues$1.abbreviated,
      wide: dayValues$1.wide.map(function (name) {
        return name + 'na';
      })
    };
    var dayPeriodValues$1 = {
      narrow: {
        am: 'ap',
        pm: 'ip',
        midnight: 'keskiyö',
        noon: 'keskipäivä',
        morning: 'ap',
        afternoon: 'ip',
        evening: 'illalla',
        night: 'yöllä'
      },
      abbreviated: {
        am: 'ap',
        pm: 'ip',
        midnight: 'keskiyö',
        noon: 'keskipäivä',
        morning: 'ap',
        afternoon: 'ip',
        evening: 'illalla',
        night: 'yöllä'
      },
      wide: {
        am: 'ap',
        pm: 'ip',
        midnight: 'keskiyöllä',
        noon: 'keskipäivällä',
        morning: 'aamupäivällä',
        afternoon: 'iltapäivällä',
        evening: 'illalla',
        night: 'yöllä'
      }
    };

    function ordinalNumber$1(dirtyNumber) {
      var number = Number(dirtyNumber);
      return number + '.';
    }

    var localize$1 = {
      ordinalNumber: ordinalNumber$1,
      era: buildLocalizeFn({
        values: eraValues$1,
        defaultWidth: 'wide'
      }),
      quarter: buildLocalizeFn({
        values: quarterValues$1,
        defaultWidth: 'wide',
        argumentCallback: function (quarter) {
          return Number(quarter) - 1;
        }
      }),
      month: buildLocalizeFn({
        values: monthValues$1,
        formattingValues: formattingMonthValues,
        defaultWidth: 'wide'
      }),
      day: buildLocalizeFn({
        values: dayValues$1,
        formattingValues: formattingDayValues,
        defaultWidth: 'wide'
      }),
      dayPeriod: buildLocalizeFn({
        values: dayPeriodValues$1,
        defaultWidth: 'wide'
      })
    };

    var matchOrdinalNumberPattern$1 = /^(\d+)(\.)/i;
    var parseOrdinalNumberPattern$1 = /\d+/i;
    var matchEraPatterns$1 = {
      narrow: /^(e|j)/i,
      abbreviated: /^(eaa.|jaa.)/i,
      wide: /^(ennen ajanlaskun alkua|jälkeen ajanlaskun alun)/i
    };
    var parseEraPatterns$1 = {
      any: [/^e/i, /^j/i]
    };
    var matchQuarterPatterns$1 = {
      narrow: /^[1234]/i,
      abbreviated: /^q[1234]/i,
      wide: /^[1234]\.? kvartaali/i
    };
    var parseQuarterPatterns$1 = {
      any: [/1/i, /2/i, /3/i, /4/i]
    };
    var matchMonthPatterns$1 = {
      narrow: /^[thmkeslj]/i,
      abbreviated: /^(tammi|helmi|maalis|huhti|touko|kesä|heinä|elo|syys|loka|marras|joulu)/i,
      wide: /^(tammikuu|helmikuu|maaliskuu|huhtikuu|toukokuu|kesäkuu|heinäkuu|elokuu|syyskuu|lokakuu|marraskuu|joulukuu)(ta)?/i
    };
    var parseMonthPatterns$1 = {
      narrow: [/^t/i, /^h/i, /^m/i, /^h/i, /^t/i, /^k/i, /^h/i, /^e/i, /^s/i, /^l/i, /^m/i, /^j/i],
      any: [/^ta/i, /^hel/i, /^maa/i, /^hu/i, /^to/i, /^k/i, /^hei/i, /^e/i, /^s/i, /^l/i, /^mar/i, /^j/i]
    };
    var matchDayPatterns$1 = {
      narrow: /^[smtkpl]/i,
      short: /^(su|ma|ti|ke|to|pe|la)/i,
      abbreviated: /^(sunn.|maan.|tiis.|kesk.|torst.|perj.|la)/i,
      wide: /^(sunnuntai|maanantai|tiistai|keskiviikko|torstai|perjantai|lauantai)(na)?/i
    };
    var parseDayPatterns$1 = {
      narrow: [/^s/i, /^m/i, /^t/i, /^k/i, /^t/i, /^p/i, /^l/i],
      any: [/^s/i, /^m/i, /^ti/i, /^k/i, /^to/i, /^p/i, /^l/i]
    };
    var matchDayPeriodPatterns$1 = {
      narrow: /^(ap|ip|keskiyö|keskipäivä|aamupäivällä|iltapäivällä|illalla|yöllä)/i,
      any: /^(ap|ip|keskiyöllä|keskipäivällä|aamupäivällä|iltapäivällä|illalla|yöllä)/i
    };
    var parseDayPeriodPatterns$1 = {
      any: {
        am: /^ap/i,
        pm: /^ip/i,
        midnight: /^keskiyö/i,
        noon: /^keskipäivä/i,
        morning: /aamupäivällä/i,
        afternoon: /iltapäivällä/i,
        evening: /illalla/i,
        night: /yöllä/i
      }
    };
    var match$1 = {
      ordinalNumber: buildMatchPatternFn({
        matchPattern: matchOrdinalNumberPattern$1,
        parsePattern: parseOrdinalNumberPattern$1,
        valueCallback: function (value) {
          return parseInt(value, 10);
        }
      }),
      era: buildMatchFn({
        matchPatterns: matchEraPatterns$1,
        defaultMatchWidth: 'wide',
        parsePatterns: parseEraPatterns$1,
        defaultParseWidth: 'any'
      }),
      quarter: buildMatchFn({
        matchPatterns: matchQuarterPatterns$1,
        defaultMatchWidth: 'wide',
        parsePatterns: parseQuarterPatterns$1,
        defaultParseWidth: 'any',
        valueCallback: function (index) {
          return index + 1;
        }
      }),
      month: buildMatchFn({
        matchPatterns: matchMonthPatterns$1,
        defaultMatchWidth: 'wide',
        parsePatterns: parseMonthPatterns$1,
        defaultParseWidth: 'any'
      }),
      day: buildMatchFn({
        matchPatterns: matchDayPatterns$1,
        defaultMatchWidth: 'wide',
        parsePatterns: parseDayPatterns$1,
        defaultParseWidth: 'any'
      }),
      dayPeriod: buildMatchFn({
        matchPatterns: matchDayPeriodPatterns$1,
        defaultMatchWidth: 'any',
        parsePatterns: parseDayPeriodPatterns$1,
        defaultParseWidth: 'any'
      })
    };

    /**
     * @type {Locale}
     * @category Locales
     * @summary Finnish locale.
     * @language Finnish
     * @iso-639-2 fin
     * @author Pyry-Samuli Lahti [@Pyppe]{@link https://github.com/Pyppe}
     * @author Edo Rivai [@mikolajgrzyb]{@link https://github.com/mikolajgrzyb}
     * @author Samu Juvonen [@sjuvonen]{@link https://github.com/sjuvonen}
     */

    var locale$1 = {
      code: 'fi',
      formatDistance: formatDistance$1,
      formatLong: formatLong$1,
      formatRelative: formatRelative$1,
      localize: localize$1,
      match: match$1,
      options: {
        weekStartsOn: 1
        /* Monday */
        ,
        firstWeekContainsDate: 4
      }
    };

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const url = 'https://agilityliitto.github.io/anomusdata/output';
    const districtFilter = writable('');
    const selectedDate = writable(addMonths(new Date(), 1));
    const previousDate = derived(selectedDate, $date => addMonths($date, -1));
    const nextDate = derived(selectedDate, $date => addMonths($date, +1));
    const cache = {
        organizers: {},
        tracks: {},
    };
    const keysCache = new Set();
    const getData = async (month) => {
        var _a, _b;
        const key = format(month, 'yyyyMM');
        if (keysCache.has(key))
            return;
        const re = await fetch(`${url}/${key}.json`);
        if (!re.ok) {
            console.log(`No data for ${key}`);
            return;
        }
        const data_min = (await re.json());
        for (const cur of data_min) {
            const { state, tracks, details, location } = cur;
            const oId = details.organizer.id;
            details.state = state;
            if (!cache.organizers[oId]) {
                cache.organizers[oId] = details.organizer;
            }
            for (const track of tracks) {
                track.date = format(new Date(track.date), "yyyyMMdd");
                cache.tracks[track.date] = (_a = cache.tracks[track.date]) !== null && _a !== void 0 ? _a : {};
                cache.tracks[track.date][oId] = (_b = cache.tracks[track.date][oId]) !== null && _b !== void 0 ? _b : [];
                cache.tracks[track.date][oId] = [
                    ...cache.tracks[track.date][oId],
                    Object.assign(Object.assign({}, track), { details: details, location }),
                ];
            }
        }
        keysCache.add(key);
    };
    const dataForMonth = async (date) => {
        await getData(date);
        const daysInMonth = getDaysInMonth(date);
        const organizers = {};
        let tracks = {};
        for (let d = 1; d <= daysInMonth; d++) {
            const dayKey = format(setDate(date, d), 'yyyyMMdd');
            if (cache.tracks[dayKey]) {
                tracks[dayKey] = cache.tracks[dayKey];
                for (const oId of Object.keys(tracks[dayKey])) {
                    organizers[oId] = cache.organizers[oId];
                }
            }
        }
        return {
            tracks,
            organizers,
        };
    };

    /* src/DayBox.svelte generated by Svelte v3.30.0 */

    const { Object: Object_1, console: console_1 } = globals;
    const file$1 = "src/DayBox.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	child_ctx[7] = i;
    	return child_ctx;
    }

    // (49:8) {#each Object.keys(filteredData) as oId, i}
    function create_each_block$1(ctx) {
    	let dayboxorg;
    	let current;

    	dayboxorg = new DayBoxOrg({
    			props: {
    				organizer: /*organizers*/ ctx[2][/*oId*/ ctx[5]],
    				tracks: /*data*/ ctx[1][/*oId*/ ctx[5]]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(dayboxorg.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(dayboxorg, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const dayboxorg_changes = {};
    			if (dirty & /*organizers, filteredData*/ 12) dayboxorg_changes.organizer = /*organizers*/ ctx[2][/*oId*/ ctx[5]];
    			if (dirty & /*data, filteredData*/ 10) dayboxorg_changes.tracks = /*data*/ ctx[1][/*oId*/ ctx[5]];
    			dayboxorg.$set(dayboxorg_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dayboxorg.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dayboxorg.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(dayboxorg, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(49:8) {#each Object.keys(filteredData) as oId, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div1;
    	let div0;
    	let h4;
    	let t0_value = format(/*date*/ ctx[0], "cccc dd.MM.yyyy", { locale: locale$1 }).toLocaleUpperCase() + "";
    	let t0;
    	let t1;
    	let current;
    	let each_value = Object.keys(/*filteredData*/ ctx[3]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			t0 = text(t0_value);
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h4, "class", "svelte-1k9ujpn");
    			add_location(h4, file$1, 42, 12, 969);
    			attr_dev(div0, "class", "date-container svelte-1k9ujpn");
    			add_location(div0, file$1, 41, 8, 928);
    			attr_dev(div1, "class", "daybox svelte-1k9ujpn");
    			toggle_class(div1, "collapse", !Object.keys(/*filteredData*/ ctx[3]).length);
    			add_location(div1, file$1, 40, 4, 848);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h4);
    			append_dev(h4, t0);
    			append_dev(div1, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*date*/ 1) && t0_value !== (t0_value = format(/*date*/ ctx[0], "cccc dd.MM.yyyy", { locale: locale$1 }).toLocaleUpperCase() + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*organizers, Object, filteredData, data*/ 14) {
    				each_value = Object.keys(/*filteredData*/ ctx[3]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*Object, filteredData*/ 8) {
    				toggle_class(div1, "collapse", !Object.keys(/*filteredData*/ ctx[3]).length);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $districtFilter;
    	validate_store(districtFilter, "districtFilter");
    	component_subscribe($$self, districtFilter, $$value => $$invalidate(4, $districtFilter = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayBox", slots, []);
    	
    	let { date } = $$props;
    	let { data } = $$props;
    	let { organizers } = $$props;
    	let filteredData = data;
    	const writable_props = ["date", "data", "organizers"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<DayBox> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("date" in $$props) $$invalidate(0, date = $$props.date);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    		if ("organizers" in $$props) $$invalidate(2, organizers = $$props.organizers);
    	};

    	$$self.$capture_state = () => ({
    		DayBoxOrg,
    		fi: locale$1,
    		format,
    		districtFilter,
    		date,
    		data,
    		organizers,
    		filteredData,
    		$districtFilter
    	});

    	$$self.$inject_state = $$props => {
    		if ("date" in $$props) $$invalidate(0, date = $$props.date);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    		if ("organizers" in $$props) $$invalidate(2, organizers = $$props.organizers);
    		if ("filteredData" in $$props) $$invalidate(3, filteredData = $$props.filteredData);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$districtFilter, data, organizers*/ 22) {
    			 if (!!$districtFilter) {
    				console.log($districtFilter);
    				$$invalidate(3, filteredData = {});

    				for (const k of Object.keys(data)) if (organizers[k].district === Number($districtFilter)) {
    					$$invalidate(3, filteredData[k] = data[k], filteredData);
    				}
    			} else {
    				$$invalidate(3, filteredData = data);
    			}
    		}
    	};

    	return [date, data, organizers, filteredData, $districtFilter];
    }

    class DayBox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { date: 0, data: 1, organizers: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayBox",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*date*/ ctx[0] === undefined && !("date" in props)) {
    			console_1.warn("<DayBox> was created without expected prop 'date'");
    		}

    		if (/*data*/ ctx[1] === undefined && !("data" in props)) {
    			console_1.warn("<DayBox> was created without expected prop 'data'");
    		}

    		if (/*organizers*/ ctx[2] === undefined && !("organizers" in props)) {
    			console_1.warn("<DayBox> was created without expected prop 'organizers'");
    		}
    	}

    	get date() {
    		throw new Error("<DayBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set date(value) {
    		throw new Error("<DayBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<DayBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<DayBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get organizers() {
    		throw new Error("<DayBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set organizers(value) {
    		throw new Error("<DayBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const capitalize = (s) => {
        if (s.length) {
            return s[0].toLocaleUpperCase().concat(s.slice(1));
        }
        return s;
    };

    /* src/MonthLane.svelte generated by Svelte v3.30.0 */

    const { Object: Object_1$1 } = globals;
    const file$2 = "src/MonthLane.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	child_ctx[5] = i;
    	return child_ctx;
    }

    // (1:0) <script lang="ts">import { format, parse }
    function create_catch_block(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script lang=\\\"ts\\\">import { format, parse }",
    		ctx
    	});

    	return block;
    }

    // (23:4) {:then data}
    function create_then_block(ctx) {
    	let show_if = Object.keys(/*data*/ ctx[2].tracks).length === 0;
    	let t;
    	let each_1_anchor;
    	let current;
    	let if_block = show_if && create_if_block$1(ctx);
    	let each_value = Object.keys(/*data*/ ctx[2].tracks).sort();
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*parse, Object, p*/ 2) {
    				each_value = Object.keys(/*data*/ ctx[2].tracks).sort();
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(23:4) {:then data}",
    		ctx
    	});

    	return block;
    }

    // (24:8) {#if Object.keys(data.tracks).length === 0}
    function create_if_block$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Tietoja ei saatavilla");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(24:8) {#if Object.keys(data.tracks).length === 0}",
    		ctx
    	});

    	return block;
    }

    // (25:8) {#each Object.keys(data.tracks).sort() as date, i}
    function create_each_block$2(ctx) {
    	let div;
    	let daybox;
    	let t;
    	let current;

    	daybox = new DayBox({
    			props: {
    				date: parse(/*date*/ ctx[3], "yyyyMMdd", 0),
    				data: /*data*/ ctx[2].tracks[/*date*/ ctx[3]],
    				organizers: /*data*/ ctx[2].organizers
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daybox.$$.fragment);
    			t = space();
    			add_location(div, file$2, 25, 12, 656);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daybox, div, null);
    			append_dev(div, t);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daybox.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daybox.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daybox);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(25:8) {#each Object.keys(data.tracks).sort() as date, i}",
    		ctx
    	});

    	return block;
    }

    // (21:14)          <p>...</p>     {:then data}
    function create_pending_block(ctx) {
    	let p_1;

    	const block = {
    		c: function create() {
    			p_1 = element("p");
    			p_1.textContent = "...";
    			add_location(p_1, file$2, 21, 8, 479);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p_1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(21:14)          <p>...</p>     {:then data}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let h3;
    	let t0_value = capitalize(format(/*selectedDate*/ ctx[0], "LLLL", { locale: locale$1 })) + "";
    	let t0;
    	let t1;
    	let promise;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 2,
    		blocks: [,,,]
    	};

    	handle_promise(promise = /*p*/ ctx[1], info);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			info.block.c();
    			add_location(h3, file$2, 17, 4, 374);
    			attr_dev(div, "class", "base svelte-1lqp8xt");
    			add_location(div, file$2, 16, 0, 351);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(h3, t0);
    			append_dev(div, t1);
    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*selectedDate*/ 1) && t0_value !== (t0_value = capitalize(format(/*selectedDate*/ ctx[0], "LLLL", { locale: locale$1 })) + "")) set_data_dev(t0, t0_value);

    			{
    				const child_ctx = ctx.slice();
    				child_ctx[2] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("MonthLane", slots, []);
    	
    	let { selectedDate } = $$props;
    	let p = dataForMonth(selectedDate);
    	const writable_props = ["selectedDate"];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MonthLane> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("selectedDate" in $$props) $$invalidate(0, selectedDate = $$props.selectedDate);
    	};

    	$$self.$capture_state = () => ({
    		format,
    		parse,
    		DayBox,
    		fi: locale$1,
    		capitalize,
    		dataForMonth,
    		selectedDate,
    		p
    	});

    	$$self.$inject_state = $$props => {
    		if ("selectedDate" in $$props) $$invalidate(0, selectedDate = $$props.selectedDate);
    		if ("p" in $$props) $$invalidate(1, p = $$props.p);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [selectedDate, p];
    }

    class MonthLane extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { selectedDate: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MonthLane",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*selectedDate*/ ctx[0] === undefined && !("selectedDate" in props)) {
    			console.warn("<MonthLane> was created without expected prop 'selectedDate'");
    		}
    	}

    	get selectedDate() {
    		throw new Error("<MonthLane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectedDate(value) {
    		throw new Error("<MonthLane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/MonthPicker.svelte generated by Svelte v3.30.0 */
    const file$3 = "src/MonthPicker.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	child_ctx[14] = i;
    	return child_ctx;
    }

    // (55:8) {#each months as m, i (i)}
    function create_each_block$3(key_1, ctx) {
    	let option;
    	let t_value = /*m*/ ctx[12] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*i*/ ctx[14];
    			option.value = option.__value;
    			add_location(option, file$3, 55, 12, 1378);
    			this.first = option;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(55:8) {#each months as m, i (i)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let button0;
    	let t1;
    	let select;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t2;
    	let input;
    	let t3;
    	let button1;
    	let mounted;
    	let dispose;
    	let each_value = /*months*/ ctx[2];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*i*/ ctx[14];
    	validate_each_keys(ctx, each_value, get_each_context$3, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$3(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "<";
    			t1 = space();
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			input = element("input");
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = ">";
    			attr_dev(button0, "title", "Edellinen");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$3, 47, 4, 1055);
    			add_location(select, file$3, 53, 4, 1252);
    			attr_dev(input, "type", "number");
    			input.value = /*yearValue*/ ctx[0];
    			attr_dev(input, "class", "svelte-19dnq5e");
    			add_location(input, file$3, 58, 4, 1443);
    			attr_dev(button1, "title", "Seuraava");
    			attr_dev(button1, "type", "button");
    			add_location(button1, file$3, 62, 4, 1563);
    			attr_dev(div, "class", "base svelte-19dnq5e");
    			add_location(div, file$3, 46, 0, 1032);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(div, t1);
    			append_dev(div, select);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*monthValue*/ ctx[1]);
    			append_dev(div, t2);
    			append_dev(div, input);
    			append_dev(div, t3);
    			append_dev(div, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*previousMonth*/ ctx[4], false, false, false),
    					listen_dev(select, "change", /*change_handler*/ ctx[8], false, false, false),
    					listen_dev(input, "change", /*change_handler_1*/ ctx[9], false, false, false),
    					listen_dev(button1, "click", /*nextMonth*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*months*/ 4) {
    				const each_value = /*months*/ ctx[2];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context$3, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, select, destroy_block, create_each_block$3, null, get_each_context$3);
    			}

    			if (dirty & /*monthValue, months*/ 6) {
    				select_option(select, /*monthValue*/ ctx[1]);
    			}

    			if (dirty & /*yearValue*/ 1) {
    				prop_dev(input, "value", /*yearValue*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("MonthPicker", slots, []);
    	let { value } = $$props;
    	const firstMonth = set(value, { date: 1, month: 0 });
    	const lastMonth = lastDayOfYear(value);
    	const months = eachMonthOfInterval({ start: firstMonth, end: lastMonth }).map(d => capitalize(format(d, "LLLL", { locale: locale$1 })));

    	function nextMonth() {
    		$$invalidate(7, value = addMonths(value, 1));
    	}

    	function previousMonth() {
    		$$invalidate(7, value = addMonths(value, -1));
    	}

    	function setYear(year) {
    		year = Number(year);
    		if (isNaN(year) || !year) return;
    		$$invalidate(7, value = set(value, { year }));
    	}

    	function setMonth(month) {
    		month = Number(month);
    		if (isNaN(month)) return;
    		$$invalidate(7, value = set(value, { month }));
    	}

    	const writable_props = ["value"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MonthPicker> was created with unknown prop '${key}'`);
    	});

    	const change_handler = e => setMonth(e.currentTarget.value);
    	const change_handler_1 = e => setYear(e.currentTarget.value);

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(7, value = $$props.value);
    	};

    	$$self.$capture_state = () => ({
    		getYear,
    		getMonth,
    		lastDayOfYear,
    		set,
    		eachMonthOfInterval,
    		format,
    		addMonths,
    		fi: locale$1,
    		capitalize,
    		value,
    		firstMonth,
    		lastMonth,
    		months,
    		nextMonth,
    		previousMonth,
    		setYear,
    		setMonth,
    		yearValue,
    		monthValue
    	});

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(7, value = $$props.value);
    		if ("yearValue" in $$props) $$invalidate(0, yearValue = $$props.yearValue);
    		if ("monthValue" in $$props) $$invalidate(1, monthValue = $$props.monthValue);
    	};

    	let yearValue;
    	let monthValue;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 128) {
    			 $$invalidate(0, yearValue = getYear(value));
    		}

    		if ($$self.$$.dirty & /*value*/ 128) {
    			 $$invalidate(1, monthValue = getMonth(value));
    		}
    	};

    	return [
    		yearValue,
    		monthValue,
    		months,
    		nextMonth,
    		previousMonth,
    		setYear,
    		setMonth,
    		value,
    		change_handler,
    		change_handler_1
    	];
    }

    class MonthPicker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { value: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MonthPicker",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*value*/ ctx[7] === undefined && !("value" in props)) {
    			console.warn("<MonthPicker> was created without expected prop 'value'");
    		}
    	}

    	get value() {
    		throw new Error("<MonthPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<MonthPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function flip(node, animation, params) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const scaleX = animation.from.width / node.clientWidth;
        const scaleY = animation.from.height / node.clientHeight;
        const dx = (animation.from.left - animation.to.left) / scaleX;
        const dy = (animation.from.top - animation.to.top) / scaleY;
        const d = Math.sqrt(dx * dx + dy * dy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (_t, u) => `transform: ${transform} translate(${u * dx}px, ${u * dy}px);`
        };
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src/App.svelte generated by Svelte v3.30.0 */
    const file$4 = "src/App.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (81:2) {#each dates as d (d.key)}
    function create_each_block$4(key_1, ctx) {
    	let div;
    	let monthlane;
    	let t;
    	let div_intro;
    	let rect;
    	let stop_animation = noop;
    	let current;

    	monthlane = new MonthLane({
    			props: { selectedDate: /*d*/ ctx[7].date },
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			create_component(monthlane.$$.fragment);
    			t = space();
    			attr_dev(div, "class", "svelte-3qz6g");
    			add_location(div, file$4, 81, 3, 2370);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(monthlane, div, null);
    			append_dev(div, t);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const monthlane_changes = {};
    			if (dirty & /*dates*/ 2) monthlane_changes.selectedDate = /*d*/ ctx[7].date;
    			monthlane.$set(monthlane_changes);
    		},
    		r: function measure() {
    			rect = div.getBoundingClientRect();
    		},
    		f: function fix() {
    			fix_position(div);
    			stop_animation();
    		},
    		a: function animate() {
    			stop_animation();
    			stop_animation = create_animation(div, rect, flip, { duration: 100 });
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(monthlane.$$.fragment, local);

    			if (!div_intro) {
    				add_render_callback(() => {
    					div_intro = create_in_transition(div, fade, {});
    					div_intro.start();
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(monthlane.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(monthlane);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(81:2) {#each dates as d (d.key)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let main;
    	let div1;
    	let monthpicker;
    	let updating_value;
    	let t0;
    	let div0;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let option4;
    	let option5;
    	let option6;
    	let option7;
    	let option8;
    	let option9;
    	let option10;
    	let option11;
    	let option12;
    	let option13;
    	let option14;
    	let option15;
    	let option16;
    	let option17;
    	let option18;
    	let option19;
    	let t21;
    	let div2;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let mounted;
    	let dispose;

    	function monthpicker_value_binding(value) {
    		/*monthpicker_value_binding*/ ctx[5].call(null, value);
    	}

    	let monthpicker_props = {};

    	if (/*$selectedDate*/ ctx[0] !== void 0) {
    		monthpicker_props.value = /*$selectedDate*/ ctx[0];
    	}

    	monthpicker = new MonthPicker({ props: monthpicker_props, $$inline: true });
    	binding_callbacks.push(() => bind(monthpicker, "value", monthpicker_value_binding));
    	let each_value = /*dates*/ ctx[1];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*d*/ ctx[7].key;
    	validate_each_keys(ctx, each_value, get_each_context$4, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$4(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$4(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			div1 = element("div");
    			create_component(monthpicker.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Kennelpiiri (kaikki)";
    			option1 = element("option");
    			option1.textContent = "Etelä-Hämeen Kennelpiiri ry.";
    			option2 = element("option");
    			option2.textContent = "Etelä-Pohjanmaan Kennelpiiri ry.";
    			option3 = element("option");
    			option3.textContent = "Helsingin Seudun Kennelpiiri ry.";
    			option4 = element("option");
    			option4.textContent = "Kainuun Kennelpiiri ry.";
    			option5 = element("option");
    			option5.textContent = "Keski-Pohjanmaan Kennelpiiri ry.";
    			option6 = element("option");
    			option6.textContent = "Keski-Suomen Kennelpiiri ry.";
    			option7 = element("option");
    			option7.textContent = "Kymenläänin Kennelpiiri ry.";
    			option8 = element("option");
    			option8.textContent = "Lapin Kennelpiiri ry.";
    			option9 = element("option");
    			option9.textContent = "Pohjois-Hämeen Kennelpiiri ry.";
    			option10 = element("option");
    			option10.textContent = "Pohjois-Karjalan Kennelpiiri ry.";
    			option11 = element("option");
    			option11.textContent = "Pohjois-Pohjanmaan Kennelpiiri ry.";
    			option12 = element("option");
    			option12.textContent = "Pohjois-Savon Kennelpiiri ry.";
    			option13 = element("option");
    			option13.textContent = "Salpausselän Kennelpiiri ry.";
    			option14 = element("option");
    			option14.textContent = "Satakunnan Kennelpiiri ry.";
    			option15 = element("option");
    			option15.textContent = "Suur-Savon Kennelpiiri ry.";
    			option16 = element("option");
    			option16.textContent = "Uudenmaan Kennelpiiri ry.";
    			option17 = element("option");
    			option17.textContent = "Vaasan Kennelpiiri ry. - Vasa Kenneldistrikt rf.\n\t\t";
    			option18 = element("option");
    			option18.textContent = "Varsinais-Suomen Kennelpiiri ry.";
    			option19 = element("option");
    			option19.textContent = "Ålands Kenneldistrikt rf.";
    			t21 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file$4, 55, 2, 1090);
    			option1.__value = "1";
    			option1.value = option1.__value;
    			add_location(option1, file$4, 56, 2, 1139);
    			option2.__value = "2";
    			option2.value = option2.__value;
    			add_location(option2, file$4, 57, 2, 1197);
    			option3.__value = "3";
    			option3.value = option3.__value;
    			add_location(option3, file$4, 58, 2, 1259);
    			option4.__value = "4";
    			option4.value = option4.__value;
    			add_location(option4, file$4, 59, 2, 1321);
    			option5.__value = "5";
    			option5.value = option5.__value;
    			add_location(option5, file$4, 60, 2, 1374);
    			option6.__value = "6";
    			option6.value = option6.__value;
    			add_location(option6, file$4, 61, 2, 1436);
    			option7.__value = "7";
    			option7.value = option7.__value;
    			add_location(option7, file$4, 62, 2, 1494);
    			option8.__value = "8";
    			option8.value = option8.__value;
    			add_location(option8, file$4, 63, 2, 1551);
    			option9.__value = "9";
    			option9.value = option9.__value;
    			add_location(option9, file$4, 64, 2, 1602);
    			option10.__value = "10";
    			option10.value = option10.__value;
    			add_location(option10, file$4, 65, 2, 1662);
    			option11.__value = "11";
    			option11.value = option11.__value;
    			add_location(option11, file$4, 66, 2, 1725);
    			option12.__value = "12";
    			option12.value = option12.__value;
    			add_location(option12, file$4, 67, 2, 1790);
    			option13.__value = "13";
    			option13.value = option13.__value;
    			add_location(option13, file$4, 68, 2, 1850);
    			option14.__value = "14";
    			option14.value = option14.__value;
    			add_location(option14, file$4, 69, 2, 1909);
    			option15.__value = "15";
    			option15.value = option15.__value;
    			add_location(option15, file$4, 70, 2, 1966);
    			option16.__value = "16";
    			option16.value = option16.__value;
    			add_location(option16, file$4, 71, 2, 2023);
    			option17.__value = "17";
    			option17.value = option17.__value;
    			add_location(option17, file$4, 72, 2, 2079);
    			option18.__value = "18";
    			option18.value = option18.__value;
    			add_location(option18, file$4, 75, 2, 2164);
    			option19.__value = "19";
    			option19.value = option19.__value;
    			add_location(option19, file$4, 76, 2, 2227);
    			if (/*$districtFilter*/ ctx[2] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[6].call(select));
    			add_location(select, file$4, 54, 7, 1050);
    			add_location(div0, file$4, 54, 2, 1045);
    			add_location(div1, file$4, 52, 1, 992);
    			attr_dev(div2, "class", "event-container svelte-3qz6g");
    			add_location(div2, file$4, 79, 1, 2308);
    			attr_dev(main, "class", "svelte-3qz6g");
    			add_location(main, file$4, 51, 0, 984);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div1);
    			mount_component(monthpicker, div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			append_dev(select, option4);
    			append_dev(select, option5);
    			append_dev(select, option6);
    			append_dev(select, option7);
    			append_dev(select, option8);
    			append_dev(select, option9);
    			append_dev(select, option10);
    			append_dev(select, option11);
    			append_dev(select, option12);
    			append_dev(select, option13);
    			append_dev(select, option14);
    			append_dev(select, option15);
    			append_dev(select, option16);
    			append_dev(select, option17);
    			append_dev(select, option18);
    			append_dev(select, option19);
    			select_option(select, /*$districtFilter*/ ctx[2]);
    			append_dev(main, t21);
    			append_dev(main, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(select, "change", /*select_change_handler*/ ctx[6]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const monthpicker_changes = {};

    			if (!updating_value && dirty & /*$selectedDate*/ 1) {
    				updating_value = true;
    				monthpicker_changes.value = /*$selectedDate*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			monthpicker.$set(monthpicker_changes);

    			if (dirty & /*$districtFilter*/ 4) {
    				select_option(select, /*$districtFilter*/ ctx[2]);
    			}

    			if (dirty & /*dates*/ 2) {
    				const each_value = /*dates*/ ctx[1];
    				validate_each_argument(each_value);
    				group_outros();
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    				validate_each_keys(ctx, each_value, get_each_context$4, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div2, fix_and_outro_and_destroy_block, create_each_block$4, null, get_each_context$4);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(monthpicker.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(monthpicker.$$.fragment, local);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(monthpicker);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $previousDate;
    	let $selectedDate;
    	let $nextDate;
    	let $districtFilter;
    	validate_store(previousDate, "previousDate");
    	component_subscribe($$self, previousDate, $$value => $$invalidate(3, $previousDate = $$value));
    	validate_store(selectedDate, "selectedDate");
    	component_subscribe($$self, selectedDate, $$value => $$invalidate(0, $selectedDate = $$value));
    	validate_store(nextDate, "nextDate");
    	component_subscribe($$self, nextDate, $$value => $$invalidate(4, $nextDate = $$value));
    	validate_store(districtFilter, "districtFilter");
    	component_subscribe($$self, districtFilter, $$value => $$invalidate(2, $districtFilter = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let dates;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function monthpicker_value_binding(value) {
    		$selectedDate = value;
    		selectedDate.set($selectedDate);
    	}

    	function select_change_handler() {
    		$districtFilter = select_value(this);
    		districtFilter.set($districtFilter);
    	}

    	$$self.$capture_state = () => ({
    		MonthLane,
    		selectedDate,
    		previousDate,
    		nextDate,
    		districtFilter,
    		MonthPicker,
    		format,
    		flip,
    		fade,
    		dates,
    		$previousDate,
    		$selectedDate,
    		$nextDate,
    		$districtFilter
    	});

    	$$self.$inject_state = $$props => {
    		if ("dates" in $$props) $$invalidate(1, dates = $$props.dates);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$previousDate, $selectedDate, $nextDate*/ 25) {
    			 {
    				$$invalidate(1, dates = [$previousDate, $selectedDate, $nextDate].map(d => ({ key: format(d, "yyyyMM"), date: d })));
    			}
    		}
    	};

    	return [
    		$selectedDate,
    		dates,
    		$districtFilter,
    		$previousDate,
    		$nextDate,
    		monthpicker_value_binding,
    		select_change_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'world'
        }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
