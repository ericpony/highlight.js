/* code  */
code, .inliine-code {
   font-family: Courier, Consolas ,Menlo, Monaco, Lucida Console, "Liberation Mono", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Courier New", monospace, serif;
   font-size: .9em;
}
.x-post h1 { font-size: 100%; }
.x-post h2 { 
   border-bottom: 1px solid #aaaaaa;
   font-size: 130%; color: gray;
   padding-bottom: 0.1em;
}

div.paragraph { 
   xfont-family: Times, Times New Roman, serif; 
   xpadding-top: 0.6em;
   margin-bottom: 2em;
   font-size: x140%;
}
div.xheader {
   clear: left;
   padding: 0.5em;
   background-color: #f9f9f9;
   border: 1px solid #aaaaaa;
}

.sh {
	display: block;
	overflow: visible;
	font-family: Consolas, "Lucida Console", "Courier New";
	font-size: .8em;
	line-height: 1.5em;
	color: black;
	width: auto;
	white-space: nowrap; 
	xfont-size: 12pt;
	xmargin: .5em 2em .5em 2em;
	xmargin-top: 2em;
	xmargin-bottom: 2em;
	word-wrap: break-word;
	word-break: break-all;
	xbackground-color: #F9F9F9;
	background-image: url(http://1.bp.blogspot.com/-6G4jc9nYmH0/U68vqvgJc1I/AAAAAAAAARQ/y82gVL7R9qA/s1600/back.png);
	background-size: 100% 100%;
}

/* code title */
.sh .bar {
	color: black;
	background-color: #CDF5D9;
	border: 1px solid lightgray;
	border-bottom: 0;
	border-radius: 8px;
	xborder-top-right-radius: 8px;
	xborder-top-left-radius: 8px;
	padding-left: 1em;
	line-height: 2em;
}

/* line number + content */
.sh ol {
	color: silver;
	background-color: #FAFAFA;
	list-style: decimal outside !important;
	margin: 1em;
	border: 1px solid lightgray;
	xborder-bottom-left-radius: 8px;
	xborder-bottom-right-radius: 8px;
	border-radius: 6px;
  overflow: visible;
}

/* content  */
.sh ol li {
	margin-left: .5em; /* line number */
	border-top: 1px dotted lightgray;
}
.sh ol li:first-child {
	border: 0;
}
.sh ul {
    list-style-type: none;
    padding: 0 1.5em !important;
    overflow: visible;
    margin: 1em !important;
    margin-left: 0 !important;
}
.sh ul li {
  xmargin-top: .07em;
  xmargin-bottom: .07em;
}
.sh .code {color: darkblue;}
.sh .comment, .sh .comments {color: #008200;}
.sh .string, .sh .char {color: brown;}
.sh .macro {color: purple;}
.sh .type {color: #069;}
.sh .keyword {color: blue;}
.sh .built-in {color: purple;}
.sh .word {}
.sh .value, .sh .hex {color: brown;}
