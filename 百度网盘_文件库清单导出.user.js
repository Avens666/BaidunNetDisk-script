// ==UserScript==
// @name         百度网盘共享文件库目录清单导出
// @namespace    https://github.com/Avens666/BaidunNetDisk-script
// @version      0.1
// @description  try to take over the world!
// @author       Avens
// @match        https://pan.baidu.com/mbox*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/1.3.3/FileSaver.min.js
// @require      https://code.jquery.com/jquery-3.1.1.min.js
// ==/UserScript==

(function() {
    'use strict';
    // Your code here...
  var classMap = {
    'title': 'sharelist-view-toggle',
  };
    var g_type=0;
    function exportDirInfo(){
     //遍历当前显示的目录及文件信息
        //step1 取得gid 一个分享文件库的主ID  有两种type，一种使用form_uk 加gid查询 这是type2，一种使用 form_uk 加 to_uk查询,这是type1
        var gid, _frm, _to;
        var obj =  document.getElementsByTagName("li");
        var obj_length = obj.length;
        var frm_arr = [];
        var to_arr = [];
        for(var i = 0 ; i < obj_length ; i++) {
            //获取每个子元素的 id 值，1-10 之间的保留
            //alert(tag_obj[i].getAttribute('id'));
            _frm = obj[i].getAttributeNode("data-frm");
            if( _frm ) {
                frm_arr.push(_frm);
            }
            
            if( gid == undefined ) {
                gid = obj[i].getAttributeNode("data-gid");
                if(gid)  g_type = 2; //取得gid
            }
            else
            {
                _to = obj[i].getAttributeNode("data-to");
                if( _to ) {
                    to_arr.push(_to);
                    g_type = 1;
                }
            }
        }

        if( g_type === 0) {
            alert("请在文件库根目录下执行!" );
               return;
        }

        //step2 根据gid获得第一级目录列表
        var dirinfo = []; //一级列表数组
        var gid_url ="";
        if(g_type == 2)
        {
            // https://pan.baidu.com/mbox/group/listshare?gid=837398806018187810&limit=50&desc=1&type=2
            gid_url = " https://pan.baidu.com/mbox/group/listshare?gid=" + gid.value + "&limit=50&desc=1&type=2";

            $.ajax({
                type:'GET',
                url: gid_url,
                data:{},
                dataType: "json",
                async: false,
                success:function(res){
                    //  var blob = new Blob(["Hello, world!"], {type: "text/plain;charset=utf-8"});
                    //  saveAs(res, "hello.txt");
                    if(res.errno != 0)
                    {
                        alert("errno:" + res.errno + "url: " + gid_url);
                        return;
                    }
                    var msg_lst = res.records.msg_list;
                    var obj_length = msg_lst.length;
                    var info="" ;
                    var index = 0;
                    for(var i = 0 ; i < obj_length ; i++) {
                        var file_lst = msg_lst[i].file_list;
                        var _msg_id = msg_lst[i].msg_id;
                        var len = file_lst.length;
                        for(var n = 0 ; n < len ; n++) {
                            var _name  = file_lst[n].server_filename;
                            var _size  = file_lst[n].size;
                            var _isDir = file_lst[n].isdir;
                            var _fs_id = file_lst[n].fs_id;
                            var dinfo = createFileInfo(_name, _isDir, _size, _fs_id, _msg_id, frm_arr[index].value, 0); index++;
                            dirinfo.push(dinfo);

                            info = info + "\n" + dinfo.getInfo();
                        }
                    }

                    // alert( info );

                },
                error:function(err){
                    alert(err);
                }
            });
            //Step3 遍历主目录
            queryDir(dirinfo, gid.value);// 传gid
        }
        else  if(g_type == 1)
        {
            // https://pan.baidu.com/mbox/msg/sessioninfo?to_uk=2181389256&type=2
            gid_url = "https://pan.baidu.com/mbox/msg/sessioninfo?to_uk=" + to_arr[0].value + "&type=2";
          //  alert(gid_url);
            $.ajax({
                type:'GET',
                url: gid_url,
                data:{},
                dataType: "json",
                async: false,
                success:function(res){
                    if(res.errno != 0)
                    {
                        alert("errno:" + res.errno + "url: " + gid_url);
                        return;
                    }
                    var rlist = res.records.list;
                    var obj_length = rlist.length;
                    var info="" ;

                    for(var i = 0 ; i < obj_length ; i++) {
                        var frm = rlist[i].from_uk;
                        var to_uk = rlist[i].to_uk;
                        var _msg_id = rlist[i].msg_id;
                        var filelist = rlist[i].filelist.list; //注意节点
                        var len = filelist.length;
                        for(var n = 0 ; n < len ; n++) {
                            var _name  = filelist[n].server_filename;
                            var _size  = filelist[n].size;
                            var _isDir = filelist[n].isdir;
                            var _fs_id = filelist[n].fs_id;
                            var dinfo = createFileInfo(_name, _isDir, _size, _fs_id, _msg_id, frm, to_uk); ;
                            dirinfo.push(dinfo);

                            info += dinfo.getInfo() + "\n";
                        }
                    }

               //      alert( info );

                },
                error:function(err){
                    alert(err);
                }
            });
            //Step3 遍历主目录
            queryDir(dirinfo, 0 );
        }

        for(var n = 0 ; n < dirinfo.length ; n++)
        {
            console.log(dirinfo[n].getAllInfo("") );
        }

   //     var blob = new Blob(["Hello, world!"], {type: "text/plain;charset=utf-8"});
   //     saveAs(blob, "hello.txt");
    }

    function queryDir(dirinfo, gidv){
      var obj_length = dirinfo.length;
        var is_failed = 0;
        for(var i = 0 ; i < obj_length ; i++) {
            if(is_failed == 1 )
            {
                alert("is_failed:" +is_failed + " dirinfo[i].isDir: " + dirinfo[i].isDir);
                break;
            }

            if(dirinfo[i].isDir == 0)
            {//文件跳过
                continue;
            }
            var dir_url ="";
            if(g_type == 1)
            {
                //https://pan.baidu.com/mbox/msg/shareinfo?msg_id=2503597858817404855&page=1&from_uk=2181389256&to_uk=1817073614&type=1&fs_id=929228779091096&num=50
                dir_url ="https://pan.baidu.com/mbox/msg/shareinfo?msg_id=" + dirinfo[i].msg_id + "&page=1&from_uk=" + dirinfo[i].from_uk + "&to_uk=" + dirinfo[i].to_uk  +"&type=1&fs_id="+ dirinfo[i].fs_id +"&num=100";
            }
            else if(g_type == 2)
            {
                dir_url ="https://pan.baidu.com/mbox/msg/shareinfo?msg_id=" + dirinfo[i].msg_id + "&page=1&from_uk=" + dirinfo[i].from_uk + "&gid=" + gidv +"&type=2&fs_id="+ dirinfo[i].fs_id +"&num=100";
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
                        alert("errno:" + res.errno + "url: " + dir_url);
                        is_failed = 1;
                        return;
                    }
                    var fileinfo = [];
                    var file_lst = res.records;
                    var len = file_lst.length;
                    var b_has_dir=0;
                    for(var n = 0 ; n < len ; n++) {
                        var _name  = file_lst[n].server_filename;
                        var _size  = file_lst[n].size;
                        var _isDir = file_lst[n].isdir;
                        var _fs_id = file_lst[n].fs_id;
                        var dinfo = createFileInfo(_name, _isDir, _size, _fs_id, dirinfo[i].msg_id, dirinfo[i].from_uk, dirinfo[i].to_uk );
                        dinfo.path = file_lst[n].path;
                        fileinfo.push(dinfo);
                        info = info + "\n" + dinfo.getInfo();

                        dirinfo[i].size += _size;
                        if(_isDir == 1)
                        {
                            dirinfo[i].num_subdir += 1;
                            b_has_dir =1;
                        }
                        else
                        {
                            dirinfo[i].num_subfile += 1;
                        }
                    }
                    dirinfo[i].sub_file_objs = fileinfo;
                  //  alert( info );

                    if(b_has_dir == 1) queryDir(fileinfo, gidv); //有目录 递归调用
                },
                error:function(err){
                    alert(err);
                }
            });
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
                return this.name + " [文件夹大小:" +  this.getSize(this.size )  + " 子文件夹数: " + this.num_subdir + " 子文件数: " + this.num_subfile +"]";
            }
            else
            {//文件
                return this.name + " (" + this.getSize( this.size )  + ")";
            }
         };

        ofile.getAllInfo = function( blank ) {
            var info;
            if(this.isDir != 0)
            { //文件夹
                info = blank+"├─" + this.name + " [文件夹大小:" +  this.getSize( this.getAllSize() )  + " 子文件夹数: " + this.num_subdir + " 子文件数: " + this.num_subfile +"]\n";
               for(var n = 0 ; n < this.sub_file_objs.length ; n++) {
                 info += this.sub_file_objs[n].getAllInfo(blank+"│  ");
             }
            }
            else
            {//文件
                info = blank+ "│  "+this.name + " (" + this.getSize( this.size  )  + ")\n";
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
         var $dropdownbutton = $('<a class="list-filter" href="javascript:void( 0 );" onclick="exportDirInfo()" node-type="btn_export" style="display: inline;">导出目录信息</a>');
        $('.' + classMap['title']).append($dropdownbutton);
        $dropdownbutton.click(exportDirInfo);
    }
    addButton();

//    alert("导出");
})();