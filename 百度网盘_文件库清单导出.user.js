// ==UserScript==
// @name        百度网盘群共享文件 - shurj.com 书软件
// @namespace    https://github.com/Avens666/BaidunNetDisk-script
// @version      1.0
// @description  try to take over the world!
// @author       Avens
// @match        https://pan.baidu.com/mbox*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/1.3.3/FileSaver.min.js
// @require     https://cdn.jsdelivr.net/npm/jquery@3.5.1/dist/jquery.min.js
// @require     https://cdn.jsdelivr.net/npm/axios@0.21.0/dist/axios.min.js
// @require     https://cdn.jsdelivr.net/npm/underscore@1.11.0/underscore.min.js
// @require     https://cdn.bootcss.com/qs/6.7.0/qs.min.js

// ==/UserScript==

(function() {
    'use strict';
    // Your code here...
    console.log('ready!')
    var classMap = {    'title': 'sharelist-view-toggle'  };
    var g_type=0;
    var lists , g_gid , g_msgid , g_frm , g_to_uk ;

    autoGetGIDByClick();
    // 通过点击文件夹自动获取gid，
    function autoGetGIDByClick(){
        $('.sharelist-container ul').click(e=>{
            let item = $(e.currentTarget).find('li.hover') ; 
            if( !item.attr('data-gid') ) return ; //子目录或文件跳出； item.attr('data-dir') != '1'  点击文件也会进入这里，但不影响使用
            g_msgid = item.attr('data-id') , g_gid = item.attr('data-gid') , g_frm = item.attr('data-frm') , g_to_uk =  item.attr('data-to') ;
        })
    }
    //获取主目录信息，可能会退出子目录，子目录层级太深要出错，还是用双击，进入目录稳妥一些。
    // find('a').eq(0) 也无法获取，完全是...隐藏了路劲。
    // function autoGetGID(){
    //     let isRootDir = $('.sharelist-history').eq(0).is(":hidden") ;
    //     let selectDir = $('.sharelist-history li[node-type="sharelist-history-list"]').eq(0).text().replace(/>.*/,'');
    //     let { id : g_msgid , gid : g_gid  , frm : g_frm ,to : g_to_uk, name } = lists.filter((i,a)=>a.name == selectDir)[0] ; // jquery 的 i,a 是反的。和Array 不同。
    //     g_type =  g_to_uk? 1 : 2 ;
    //     if( isRootDir ) return null ;
    //     return g_msgid ;
    // }
    function getRootGids(){
        // let isRootDir = $('.sharelist-history').eq(0).is(":hidden") ;
        // let selectDir = $('.sharelist-history li[node-type="sharelist-history-list"]').eq(0).text().replace(/>.*/,'');
        lists = $('.sharelist-container ul').eq(0).find('li').map((index,i)=> Object({ id: i.getAttribute('data-id') ,gid: i.getAttribute('data-gid') ,frm: i.getAttribute('data-frm') ,to: i.getAttribute('data-to') , name: $(i).find('.sharelist-item-title-name').text() }) ) ;
    }
     
   async function exportSubDir(){
        // let lst = Array.from(document.getElementsByTagName('li')).filter(item => item.getAttribute('node-type') === 'sharelist-item');
        // const obj = lst.filter(item => item.getAttribute('class') === 'on');
        var lis = $('.sharelist-container ul').eq(0).find('li.on');
        lis = [...lis] ;

        let selectDir = $('.sharelist-history li[node-type="sharelist-history-list"]').eq(0).text().replace(/>.*/,'');
        // g_msgid = autoGetGID() ;
        if( g_msgid === null) return alert("请在文件库根目录下执行“获取ID”!" );
        let dirinfo = lis.map(li=>{
            let _name  = $(li).find('span[class="global-ellipsis sharelist-item-title-name"]').find('a').html();
            let _size  = 1;
            let _isDir = 1;
            let _fs_id = li.getAttribute("data-fid");
            return createFileInfo(_name, _isDir, _size, _fs_id, g_msgid, g_frm, g_to_uk);
        })

        //Step3 遍历目录
        await queryDir(dirinfo);// 传gid
        saveFiles(dirinfo)
     }

   async function exportDir(){
        // let lst = Array.from(document.getElementsByTagName('li')).filter(item => item.getAttribute('node-type') === 'sharelist-item');
        // const obj = lst.filter(item => item.getAttribute('class') === 'on');
        var obj = $('.sharelist-container ul').eq(0).find('li.on');
        var obj_length = obj.length;
        var selected_arr = [];
        var dirinfo = []; //一级列表数组
        g_msgid = null;
        for(var i = 0 ; i < obj_length ; i++) {

            let lt = Array.from(obj[0].children).filter(item => item.getAttribute('class') === 'sharelist-item-size global-ellipsis');
            if(lt.length == 1)
            {
                if(lt[0].textContent == '-') //文件夹
                {
                    var _msgid = obj[i].getAttribute('data-id');
                    g_msgid = _msgid;
                    g_gid = obj[i].getAttribute("data-gid");
                    var _frm = obj[i].getAttribute("data-frm");
                    var _to_uk = obj[i].getAttribute('data-to');
                    var _fs_id = obj[i].getAttribute('data-fid');

                    if (_to_uk === null) {
                        g_type = 2;
                    } else {
                        g_type = 1;
                    }

                    var _name  = $(obj[i]).find('span[class="global-ellipsis sharelist-item-title-name"]').find('a').html();
                    var _size  = 1;
                    var _isDir = 1;
                    var dinfo = createFileInfo(_name, _isDir, _size, _fs_id, _msgid, _frm, _to_uk);
                    dirinfo.push(dinfo);
                }
            }
        }

        if( g_msgid === null) return alert("请在文件库根目录下执行!" );

        //Step3 遍历目录
        await queryDir(dirinfo);
        saveFiles(dirinfo)
     }
     async function saveFiles(dirinfo){
        let tempFiles = getFiles(dirinfo) ; 
        let baiduFiles = _.flatten(tempFiles) ;
        window.baiduPanDirInfo = dirinfo , window.baiduFiles = baiduFiles ;
        let epubs = baiduFiles.filter(i=> i&& i.name && i.name.includes('epub') ) ;
        let azws = baiduFiles.filter(i=> i&& i.name && i.name.includes('azw') ) ;
        console.warn( '导出目录：' , { dirLen: baiduFiles.length  , epubLen: epubs.length , otherLen : baiduFiles.length - epubs.length } )
        let fileName = dirinfo.map(i=> i.getAllInfo("", 0)).join("\r\n") + "<end>\n";
        var blob = new Blob([fileName], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "exportFileNames.txt");

        // let links = [] ;
        let links = '' ;
        var len = baiduFiles.length ;
        for(let i=0;i<= len-1 ;i++){
            var item = baiduFiles[i] ;
            let link = await item.getLink() ;
            if( !link ) continue ;
            localStorage.setItem(`fs_id${ item.fs_id }`, link)
            links += link + '\n' ;
            push2DownloadApp(link, item.name , `E:\\Downloads${ item.path }` , item.fs_id );
        }
        blob = new Blob([links], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "exportFileLinks.txt");
     }

    async function push2DownloadApp(link,filename , dir , fs_id ){
        let url = `http://localhost:6800/jsonrpc` ;
        let BDUSS = getBDUSS() ;
        if (!BDUSS) return alert('百度登录状态异常');
        dir = dir || 'E:\\Downloads' ;
        let json_rpc = {id: new Date().getTime(),jsonrpc: '2.0',method: 'aria2.addUri',
        params: ["token:" , [link],{dir , out: filename, header: ['User-Agent:' + navigator.userAgent , 'Cookie: BDUSS=' + getBDUSS()]}
            ]
        };
        let res = await axios.post( url , JSON.stringify(json_rpc) ).then(r=>r.data); 
        if( fs_id && res && res.result ) localStorage.setItem(`fs_id${fs_id}`, 'done' )
        console.log('push2DownloadApp: ' , filename , res ,  link) ;
    }
    function getBDUSS() {
        let baiduyunPlugin_BDUSS = getStorage('baiduyunPlugin_BDUSS') ? getStorage('baiduyunPlugin_BDUSS') : '{"baiduyunPlugin_BDUSS":""}';
        let BDUSS = JSON.parse(baiduyunPlugin_BDUSS).BDUSS;
        if (!BDUSS) return '' ; // alert('');
        return BDUSS;
    }

    function getFiles  ( dirFile ){
        if( _.isArray(dirFile) ) return dirFile.map(i=>getFiles(i)) 
        if( dirFile.isDir == 0 ) return [dirFile] ;
        dirFile.sub_file_objs = dirFile.sub_file_objs || [] ;
        if(dirFile.sub_file_objs.length) return dirFile.sub_file_objs.map(i=>getFiles(i)) 
        else return [dirFile] ;
    }

    async function queryDir(dir_info){
      var obj_length = dir_info.length;

        for(let i = 0 ; i < obj_length ; i++) {

            if(dir_info[i].isDir == 0)  continue; //文件跳过
            var dir_url ="";
            var fileinfo = [];

            var b_has_dir=0;
            var n_page=1;
            var b_more = 1;

             var is_failed_p = 0;
            while(n_page <= 30 && b_more == 1 || is_failed_p > 0) //一次最多取100个，超出了要分页取 z最多取3000
            {
                if(is_failed_p > 0 )
                {
                    console.log("is_failed_p:" +is_failed_p + " page: " + n_page + " dir_info[i].isDir: " + dir_info[i].isDir);
                    if(is_failed_p > 2 ) //多试几次
                    {
                        break;
                    }
                }

                if(g_type == 1)
                {
                    //https://pan.baidu.com/mbox/msg/shareinfo?msg_id=2503597858817404855&page=1&from_uk=2181389256&to_uk=1817073614&type=1&fs_id=929228779091096&num=50
                    dir_url ="https://pan.baidu.com/mbox/msg/shareinfo?msg_id=" + dir_info[i].msg_id + "&page=" + n_page + "&from_uk=" + dir_info[i].from_uk + "&to_uk=" + dir_info[i].to_uk  +"&type=1&fs_id="+ dir_info[i].fs_id +"&num=100";
                }
                else if(g_type == 2)
                {
                    dir_url ="https://pan.baidu.com/mbox/msg/shareinfo?msg_id=" + dir_info[i].msg_id + "&page=" + n_page + "&from_uk=" + dir_info[i].from_uk + "&gid=" + g_gid +"&type=2&fs_id="+ dir_info[i].fs_id +"&num=100";
                }
                console.log(dir_url);

                let res = await axios.get(dir_url ).then(r=>r.data).catch(e=>{ console.error('shareinfo error:' ,e), is_failed_p ++ }) ;
                // 可能不是json对象，返回了意料外的html内容，
                if( !res ) { 
                    is_failed_p ++ , console.warn("errno: null"  + "url: " + dir_url)  ;
                    continue ;
                }
                if( res.errno) {
                     is_failed_p ++ , console.warn("errno:" + res.errno + "url: " + dir_url)  ;
                     continue ;
                } ;
                var info="" ;
                is_failed_p =0; //成功重置
                var file_lst = res.records || [];
                var len = file_lst.length;
                b_more = res.has_more;

                for(var n = 0 ; n < len ; n++) {
                    var _name  = file_lst[n].server_filename;
                    var _size  = file_lst[n].size;
                    var _isDir = file_lst[n].isdir;
                    var _fs_id = file_lst[n].fs_id;
                    //console.log( "11msg: " + dir_info[i] );
                    //console.log( "33msg: " + dir_info[i].msg_id );
                    var dinfo = createFileInfo(_name, _isDir, _size, _fs_id, dir_info[i].msg_id, dir_info[i].from_uk, dir_info[i].to_uk );
                    dinfo.path = "";
                    var lastn = file_lst[n].path.lastIndexOf("/") ;
                    if(lastn > 0)
                        dinfo.path = file_lst[n].path.substring(0,lastn+1);
                    else
                        dinfo.path = file_lst[n].path;
                    fileinfo.push(dinfo);
                    info = info + "\n" + dinfo.getInfo();

                    if(_isDir == 1)
                    {
                        dir_info[i].num_subdir += 1;
                        b_has_dir =1;
                    }
                    else
                    {
                        dir_info[i].num_subfile += 1;
                    }
                }
                n_page++;
                //  alert( info );
            }
            dir_info[i].sub_file_objs = fileinfo;
            if(b_has_dir == 1) await queryDir(fileinfo); //有目录 递归调用
        }
    }
    async function getFileDownloadLink( primaryid , fs_id ){
        let sharedownload = `https://pan.baidu.com/api/sharedownload?sign=&timestamp=&bdstoken=${ yunData.MYBDSTOKEN || '' }&channel=chunlei&web=1&app_id=250528&logid=${ getLogID() }=&clienttype=0`
        let opts = { headers: {    'Content-Type': 'application/x-www-form-urlencoded'  } }
        let data = { encrypt: 0,uk: 4215730515,product: 'mbox', primaryid: primaryid }
        var qs = Qs 
        data = qs.stringify(data) ;
         //,fid_list:[this.fs_id] , extra: {"type":"group","gid":"874216807572575634"}
        data = `${data}&fid_list=["${fs_id}"]&extra={"type":"group","gid":"`${g_gid}`"}`
        let res = await axios.post(sharedownload , data, opts ).then(r=>r.data).catch(e=> console.error('sharedownload error:',e)) ;
        if(!res) return console.warn("errno: null"  + "url: " + sharedownload); 
        if(res.errno) return console.warn("errno:" + res.errno + "，msg_id: " + primaryid ); 
        return res && res.list ? res.list.map(i=>i.dlink).join('\n') : '' ;
    }

    // 目录或文件对象
    // name;  //文件(夹)名称
    //     isDir; //是否文件夹
    //     size;  //文件大小
    //     num_subfile = 0;  //子文件数量
    //     num_subdir = 0;  //子目录数量
    //     num_allfile = 0;  //递归子目录数量
    //     num_alldir = 0;  //递归子文件数量
    //     sub_file_objs=[]; //子文件对象
    function createFileInfo(name,isDir,size, fs_id, msg_id, from_uk, to) {
        let ofile = { name,isDir,size, fs_id, msg_id, from_uk, to , path: '' } ; 
        ofile.getLink = async function(){
            return await getFileDownloadLink( this.msg_id , this.fs_id) ;
        }
        ofile.getSize = function( s) //返回尺寸
        {
            if(s < 1024)
            {
                return s+" Byte";
            }
            else if (s > 1024 && s < 1048576 ) //1024*1024
            {
                return  Math.round(s/1024 * 100) / 100.00 +" KB";
            }
            else if (s> 1048576 && s < 1073741824) // 1024*1024*1024
            {
                return Math.round(s/(1048576) * 100) / 100.00+" MB";
            }
            else
            {
                return Math.round(s/(1073741824) * 100) / 100.00+" GB";
            }
        };
        ofile.getInfo = function() {
            if(this.isDir ) return this.name + " [文件夹大小:" +  this.getSize(this.size )  + " 子文件夹数: " + this.num_subdir + " 子文件数: " + this.num_subfile +"]" ;
            else return this.name + " (" + this.getSize( this.size )  + ")" ; //文件
         };

        ofile.getAllInfo = function( blank, level ) {
            var info;
            if(this.isDir != 0)
            { //文件夹
                info = blank+"├─" + this.name + " [文件夹大小:" +  this.getSize( this.getAllSize() )  + " 子文件夹数: " + this.num_subdir + " 子文件数: " + this.num_subfile +"]\r\n";
                level++;
               for(var n = 0 ; n < this.sub_file_objs.length ; n++) {
                 info +=  level+ this.sub_file_objs[n].getAllInfo(blank+"│  ", level);
               }
            }
            else
            {//文件
                info = blank+ "│  "+this.name + " (" + this.getSize( this.size  )  + ")  --  " + this.path + "\r\n";
            }
            return info;
         };

        ofile.getAllSize= function(){
            if(this.isDir == 1)
            { //文件夹
                this.size=0;
               for(var n = 0 ; n < this.sub_file_objs.length ; n++) {
                 this.size += this.sub_file_objs[n].getAllSize();
             }
            }
             return this.size;

        };
        return ofile;
    }

     //添加导出按钮
    function addButton() {
        var $dropdownbutton = $('<a class="list-filter" href="javascript:void( 0 );" onclick="exportDir()" node-type="btn_export" title="在文件库根目录，选择要导出的文件夹，点击按钮，清单生成后会提示保存文件。\n如果文件夹内部子文件夹很多，需要等待较长时间。8000个子文件夹大概1小时" style="display: inline;">导出目录</a>');
        $('.' + classMap['title']).append($dropdownbutton);
        $dropdownbutton.click(exportDir);

        var $dropdownbutton3 = $('<a class="list-filter" href="javascript:void( 0 );" onclick="exportSubDir()" node-type="btn_export" title="导出任意层级的子文件夹信息。\n需要先在主目录下，选择文件夹所在根目录，点击<ID按钮>获取主目录信息。\n然后可以进入子目录，选择要导出的子目录进行导出!" style="display: inline;">子目录</a>');
        $('.' + classMap['title']).append($dropdownbutton3);
        $dropdownbutton3.click(exportSubDir);

    }
    addButton();


    function replaceLink(link) {
        return link ? link.replace(/&/g, '&amp;') : '';
    }

    function detectPage() {
        let regx = /[\/].+[\/]/g;
        let page = location.pathname.match(regx);
        return page[0].replace(/\//g, '');
    }

    function getCookie(e) {
        let o, t;
        let n = document, c = decodeURI;
        return n.cookie.length > 0 && (o = n.cookie.indexOf(e + "="), -1 != o) ? (o = o + e.length + 1, t = n.cookie.indexOf(";", o), -1 == t && (t = n.cookie.length), c(n.cookie.substring(o, t))) : "";
    }

    function setCookie(key, value, t) {
        let oDate = new Date();  //创建日期对象
        oDate.setTime(oDate.getTime() + t * 60 * 1000); //设置过期时间
        document.cookie = key + '=' + value + ';expires=' + oDate.toGMTString();  //设置cookie的名称，数值，过期时间
    }

    function getValue(name) {
        return GM_getValue(name);
    }

    function setValue(name, value) {
        GM_setValue(name, value);
    }

    function getStorage(key) {
        return localStorage.getItem(key);
    }

    function setStorage(key, value) {
        return localStorage.setItem(key, value);
    }

    function encode(str) {
        return btoa(unescape(encodeURIComponent(btoa(unescape(encodeURIComponent(str))))));
    }

    function decode(str) {
        return decodeURIComponent(escape(atob(decodeURIComponent(escape(atob(str))))));
    }

    function getLogID() {
        let name = "BAIDUID";
        let u = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/~！@#￥%……&";
        let d = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
        let f = String.fromCharCode;

        function l(e) {
            if (e.length < 2) {
                let n = e.charCodeAt(0);
                return 128 > n ? e : 2048 > n ? f(192 | n >>> 6) + f(128 | 63 & n) : f(224 | n >>> 12 & 15) + f(128 | n >>> 6 & 63) + f(128 | 63 & n);
            }
            let n = 65536 + 1024 * (e.charCodeAt(0) - 55296) + (e.charCodeAt(1) - 56320);
            return f(240 | n >>> 18 & 7) + f(128 | n >>> 12 & 63) + f(128 | n >>> 6 & 63) + f(128 | 63 & n);
        }

        function g(e) {
            return (e + "" + Math.random()).replace(d, l);
        }

        function m(e) {
            let n = [0, 2, 1][e.length % 3];
            let t = e.charCodeAt(0) << 16 | (e.length > 1 ? e.charCodeAt(1) : 0) << 8 | (e.length > 2 ? e.charCodeAt(2) : 0);
            let o = [u.charAt(t >>> 18), u.charAt(t >>> 12 & 63), n >= 2 ? "=" : u.charAt(t >>> 6 & 63), n >= 1 ? "=" : u.charAt(63 & t)];
            return o.join("");
        }

        function h(e) {
            return e.replace(/[\s\S]{1,3}/g, m);
        }

        function p() {
            return h(g((new Date()).getTime()));
        }

        function w(e, n) {
            return n ? p(String(e)).replace(/[+\/]/g, (e) => {
                return "+" == e ? "-" : "_";
            }).replace(/=/g, "") : p(String(e));
        }

        return w(getCookie(name));
    }

//    alert("导出");
})();