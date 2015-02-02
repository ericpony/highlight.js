(function() {
	var LANG = {
		'Scala': {
			nominals: 'type object trait class extends',
			types: 'Int Char String Double Float Long Boolean Short Byte Any AnyRef Nothing Null Unit Iterator Map Set Seq Array List Vector Tuple[\\d]*',
			keywords: 'type yield lazy override def with val var false true sealed abstract private null if for while throw finally protected extends import final return else break new catch super class case package default try this match continue throws implicitly implicit _[\\d]+',
			built_in: ''
		},
		'JavaScript': {
			nominals: '',
			types: '',
			keywords: 'in if for while finally var new function do return void else break catch instanceof with throw case default try this switch continue typeof delete let yield const class',
			built_in: 'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape Object Function Boolean Error EvalError InternalError RangeError ReferenceError StopIteration SyntaxError TypeError URIError Number Math Date String RegExp Array Float32Array Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl arguments require'
		},
		'Java': {
			nominals: 'interface class extends implements',
			types: 'int float char boolean void long short double String null',
			keywords: 'false synchronized abstract private static if const for true while strictfp finally protected import native final enum else break transient catch instanceof byte super volatile case assert short package default public try this switch continue throws protected public private new return throw throws',
			built_in: ''
		},
		'C++': {
			nominals: '',
			types: 'char bool short int long float double unsigned clock_t size_t va_list __int32 __int64',
			keywords: 'break case catch class const const_cast continue default delete do dynamic_cast else enum explicit extern if for friend goto inline mutable namespace new operator private public protected register reinterpret_cast return sizeof static static_cast struct switch template this throw true false try typedef typeid typename union using virtual void volatile while',
			built_in: ''
		}
	};
	LANG['Cpp'] = LANG['C'] = LANG['C++'];

	var COMMON = [
		{r:/\/\*[\s\S]*?\*\//gm, css:'comments'},
		{r:/\/\/.*$/gm, css:'comment'},
	//	{r:/^ *#.*/gm, css:'macro'},
		{r:/"([^"\\\n]|\\.)*"/g, css:'string'},
		{r:/'([^'\\\n]|\\.)*'/g, css:'char'},
		{r:/[a-zA-Z]+\d+/g, css:''},
	//	{r:/[^\W\d]\w*/g, css:'word'},
		{r:/0[xX][\da-fA-F]+/g, css:'hex'},
		{r:/\d*\.?\d+[eE]?\d*/g, css:'value'}
	];

	function unescape(text)
	{
		return text
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&nbsp;/g, ' ');
	}
	function escape(text)
	{
		return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/ /g, '&nbsp;');
	}

	function string2regex (str) 
	{
		return '\\b' + str.replace(/ /g, '\\b|\\b') + '\\b';
	}
	function tab2spaces(text)
	{
		var spaces = '    ';
		var stext = '';
		var lines = unescape(text).replace(/\n$/g, '').split('\n');
		for(var i = 0; i < lines.length; i++)
		{
			for(var p = 0; (p = lines[i].indexOf('\t')) != -1;)
				lines[i] = lines[i].replace(/\t/, spaces.slice(0, 4-p%4));
			stext += lines[i] + '\n';
		}
		return stext;
	}

	function createSyntaxRegex(lang)
	{	
		var syntax = LANG[lang];
		if(!syntax) return null; 
		if(syntax.processed) return syntax;
	
		syntax.keywords = syntax.keywords ? { r:new RegExp(string2regex(syntax.keywords),'g'), css:'keyword'} : '';
		syntax.types    = syntax.types ?    { r:new RegExp(string2regex(syntax.types),'g'), css:'type'} : '';
		syntax.built_in = syntax.built_in ? { r:new RegExp(string2regex(syntax.built_in),'g'), css:'built-in' } : '';	
		syntax.nominals  = !syntax.nominals ? null : {
				r:      new RegExp('(' + string2regex(syntax.nominals) + ') +([^\\n (\[]+)', 'g'), 
				css:    'built-in', 
				update: (function() {
									var built_in_types = {};
									(syntax.built_in.split(' ')||[]).forEach(function(b){ built_in_types[b] = true });
									return function(t) { 
										if(built_in_types[t]) return;
										built_in_types[t] = true;
										var tt = '';
										for(var t in built_in_types) tt += ' ' + t;
										tt = tt.substr(1);
										syntax.built_in.r = new RegExp(string2regex(tt),'g');
										cache.m[cache.m.length-1] = 0;
									}
								})() 
						};
		syntax.processed = true;
		return syntax;
	}

	var cache = {};

	function colorize(str, css)
	{
		if(str == null || str.length == 0) return;

		//var lines = escape(str).split('\n');
		var lines = str.split('\n');

		for(var i = 0; i < lines.length; i++)
		{
			if(!cache.line)
			{
				var li = document.createElement('LI');
				var line = document.createElement('SPAN');
				line.className = 'code';
				li.appendChild(line);			
				cache.line = line;
			}

			if(lines[i] != '')
			{
				if(css!=null)
				{
					var span = document.createElement('SPAN');
					span.className = css;
					span.innerHTML = lines[i];
					cache.line.appendChild(span);
				}else{
					cache.line.appendChild(document.createTextNode(lines[i].replace(/ /g,'\u00a0')));
				}
			}

			if(i + 1 < lines.length)
			{
				// FF need insert '&nbsp;' to make empty <li> displayed
				if(cache.line.innerHTML == '') cache.line.innerHTML = '&nbsp;';
				cache.codeArea.appendChild(cache.line.parentNode);
				cache.line = null;
			}
		}
	}

	function createHighlightedCode(lang, element, options)
	{
		options = options || {};
		var text = tab2spaces(element.innerHTML);
		var q = 0;
		var token1, token2 = '';
		var regexps = (function (SYNTAX){
			var ret = [];
			for(var rule in COMMON) ret.push(COMMON[rule]);
			for(var rule in SYNTAX) SYNTAX[rule] && ret.push(SYNTAX[rule]);
			cache.m = ret.map(function(){ return 0 });
			return ret;
		})(createSyntaxRegex(lang));

		if(options['lineno']) {
			cache.codeArea = document.createElement('OL'); 
		}else {
			var ul = document.createElement('UL');
			//ul.style.listStyleType = 'none';
			//ul.style.padding = '10px';
			//ul.style.overflow = 'visible';
			cache.codeArea = document.createElement('UL');
		}

		while(1)
		{
			var ii = -1;
			var p0 = p = text.length;
			for(var i = 0; i < regexps.length; i++)
			{
				var m = cache.m;
				if(m[i] == null) continue;
				if(!regexps[i].r) continue;
				if(m[i] == 0 || m[i].index < q)
				{
					var r = regexps[i].r;
					r.lastIndex = q;
					m[i] = r.exec(text);
				}
				if(m[i] == null) continue;
				var t1 = '', t2 = m[i][0], pp = m[i].index;
				if(m[i].length>2 && m[i][1])
				{
					pp += m[i][1].length + 1;
					t1 = m[i][1];
					t2 = m[i][2];
				}
				if(m[i].index < p) { p = m[i].index; ii = i; token1 = t1; token2 = t2; }
			}

			if(ii == -1){ colorize(text.slice(q), null); break;} // no highlight needed anymore

			colorize(text.slice(q, p), null);  // plain text in text[q...p]
			if(token1)
			{
				colorize(token1 + ' ', 'keyword');
				if(regexps[ii].update) regexps[ii].update(token2);
			}
			colorize(token2, regexps[ii].css);
			q = regexps[ii].r.lastIndex;
		}// end of while

		var div = document.createElement('DIV');
		div.className = 'sh';
		while (div.firstChild)
		{
				div.removeChild(div.firstChild);
		}
		div.appendChild(cache.codeArea);
		element.parentNode.replaceChild(div, element);

	}// end of function parse

	for(var lang in LANG)
	{
		var snippets = document.getElementsByClassName(lang);
		while(snippets.length) {
			var code = snippets[0];
			var options  = {lineno: code.attributes['lineno'] };
			createHighlightedCode(lang, code, options);
		}
	}
})();
