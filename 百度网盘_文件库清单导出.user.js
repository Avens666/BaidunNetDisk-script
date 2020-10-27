// ==UserScript==
// @name         百度网盘共享文件库目录清单导出
// @namespace    https://github.com/Avens666/BaidunNetDisk-script
// @version      0.5
// @description  try to take over the world!
// @author       Avens
// @match        https://pan.baidu.com/mbox*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/1.3.3/FileSaver.min.js
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.1.1/jquery.min.js
// @note         2020.10.26-V0.5 增加取子目录的功能
// ==/UserScript==

//
// 主目录类型 type1 <li class="" node-type="sharelist-item" data-id="94956815229992845" data-frm="2687769004" data-to="2181389256" data-fid="1117071517154765">
// 主目录类型 type2 <li class="" node-type="sharelist-item" data-id="8522742650637316248" data-frm="574440818" data-gid="697250947953272568" data-fid="494436556508384">
// 子目录 <li class="" node-type="sharelist-item" data-fid="715901954634145">


(function() {
    'use strict';
    // Your code here...
  var classMap = {
    'title': 'sharelist-view-toggle',
  };
    var g_type=0;
    var g_gid;
    var g_msgid;
    var g_frm;
    var g_to_uk;

    //获取主目录信息
 function getGID(){
     //遍历当前显示的目录及文件信息
     //step1 取得gid 一个分享文件库的主ID  有两种type，一种使用form_uk 加gid查询 这是type2; 一种使用 form_uk 加 to_uk查询,这是type1
     let lst = Array.from(document.getElementsByTagName('li')).filter(item => item.getAttribute('node-type') === 'sharelist-item');
     const obj = lst.filter(item => item.getAttribute('class') === 'on');
     var obj_length = obj.length;
     g_msgid = null;
     if(obj_length != 1)
     {
         alert("请在文件库根目录下,仅选中一个目录后执行!" );
         return;
     }

     //判断是否目录
     //<div class="sharelist-item-size global-ellipsis">-</div>
     let lt = Array.from(obj[0].children).filter(item => item.getAttribute('class') === 'sharelist-item-size global-ellipsis');
     if(lt.length == 1)
     {
         if(lt[0].textContent == '-')
         {
             g_msgid = obj[0].getAttribute('data-id');
             g_gid = obj[0].getAttribute("data-gid");
             g_frm = obj[0].getAttribute("data-frm");
             g_to_uk = obj[0].getAttribute('data-to');

             if (g_to_uk === null) {
                 g_type = 2;
             } else {
                 g_type = 1;
             }
         }
     }
     else
     {
         alert("请在文件库根目录下,仅选中一个目录后执行!" );
         return;
     }

    //    alert("g_gid=" + g_gid + "  msg_id=" + g_msgid+ " frm="+g_frm+ " to="+g_to_uk);
        if( g_msgid === null) {
            alert("请在文件库根目录下,选中一个目录后执行!" );
               return;
        }
        else
        {
            alert("取得主目录信息成功，可以单独导出该目录下的子目录信息!" );
        }
  }

  function exportSubDir(){
        let lst = Array.from(document.getElementsByTagName('li')).filter(item => item.getAttribute('node-type') === 'sharelist-item');
        const obj = lst.filter(item => item.getAttribute('class') === 'on');
        var obj_length = obj.length;
        var selected_arr = [];
        var dirinfo = []; //一级列表数组

        if( g_msgid === null)
        {
            alert("请在文件库根目录下执行“获取ID”!" );
            return;
        }

        for(var i = 0 ; i < obj_length ; i++) {
            var _name  = $(obj[i]).find('span[class="global-ellipsis sharelist-item-title-name"]').find('a').html();
            var _size  = 1;
            var _isDir = 1;
            var _fs_id = obj[i].getAttribute("data-fid");
            var dinfo = createFileInfo(_name, _isDir, _size, _fs_id, g_msgid, g_frm, g_to_uk);
            dirinfo.push(dinfo);
        }


        //Step3 遍历目录
        queryDir(dirinfo);// 传gid
        var output="";
        for(var n = 0 ; n < dirinfo.length ; n++)
        {
            //   console.log(dirinfo[n].getAllInfo("") );
            output +=dirinfo[n].getAllInfo("", 0) +"\r\n";
        }

        output += "<end>";
        var blob = new Blob([output], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "exportDirList.txt");
     }

  function exportDir(){
        let lst = Array.from(document.getElementsByTagName('li')).filter(item => item.getAttribute('node-type') === 'sharelist-item');
        const obj = lst.filter(item => item.getAttribute('class') === 'on');
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

        if( g_msgid === null)
        {
            alert("请在文件库根目录下执行!" );
            return;
        }


        //Step3 遍历目录
        queryDir(dirinfo);
        var output="";
        for(var n = 0 ; n < dirinfo.length ; n++)
        {
            //   console.log(dirinfo[n].getAllInfo("") );
            output +=dirinfo[n].getAllInfo("", 0) +"\r\n";
        }

        output += "<end>";
        var blob = new Blob([output], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "exportDirList.txt");
     }

    function queryDir(dir_info){
      var obj_length = dir_info.length;

        for(var i = 0 ; i < obj_length ; i++) {

            if(dir_info[i].isDir == 0)
            {//文件跳过
                continue;
            }
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


                $.ajax({
                    type:'GET',
                    url:dir_url,
                    data:{},
                    dataType: "json",
                    async: false,
                    success:function(res){
                        var info="" ;
                        if(res.errno != 0)
                        {
                            console.warn("errno:" + res.errno + "url: " + dir_url);
                             is_failed_p ++;
                            return;
                        }
                         is_failed_p =0; //成功重置
                        var file_lst = res.records;
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
                    },
                    error:function(err){
                        console.error(err);
                        is_failed_p ++;
                    }
                });
            }
            dir_info[i].sub_file_objs = fileinfo;
            if(b_has_dir == 1) queryDir(fileinfo); //有目录 递归调用
        }
    }

    // 目录或文件对象
    function createFileInfo(name,isDir,size, fs_id, msg_id, frm, to) {
        var ofile = new Object;
        ofile.name = name;  //文件(夹)名称
        ofile.isDir = isDir; //是否文件夹
        ofile.size = size;  //文件大小
        ofile.fs_id= fs_id;
        ofile.msg_id= msg_id;
        ofile.from_uk=frm;
        ofile.to_uk=to;
        ofile.num_subfile = 0;  //子文件数量
        ofile.num_subdir = 0;  //子目录数量
        ofile.num_allfile = 0;  //递归子目录数量
        ofile.num_alldir = 0;  //递归子文件数量
        ofile.sub_file_objs=[]; //子文件对象
        ofile.path="";
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
            if(this.isDir != 0)
            { //文件夹
                return this.name + " [文件夹大小:" +  this.getSize(this.size )  + " 子文件夹数: " + this.num_subdir + " 子文件数: " + this.num_subfile +"]" ;
            }
            else
            {//文件
                return this.name + " (" + this.getSize( this.size )  + ")" ;
            }
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

        var $dropdownbutton3 = $('<a class="list-filter" href="javascript:void( 0 );" onclick="exportSubDir()" node-type="btn_export" title="导出任意层级的子文件夹信息，但需要先在主目录下，选择文件夹所在根目录，点击<ID按钮>获取主目录信息，然后可以进入子目录，选择要导出的子目录进行导出!" style="display: inline;">子目录</a>');
        $('.' + classMap['title']).append($dropdownbutton3);
        $dropdownbutton3.click(exportSubDir);

        var $dropdownbutton2 = $('<a class="list-filter" href="javascript:void( 0 );" onclick="getGID()" node-type="btn_export" title="为了导出子文件夹，需要先获取主目录信息, 请在文件库根目录下，选择要导出的子目录所在的根目录后执行!" style="display: inline;">ID</a>');
        $('.' + classMap['title']).append($dropdownbutton2);
        $dropdownbutton2.click(getGID);



    }
    addButton();
//    alert("导出");
})();
