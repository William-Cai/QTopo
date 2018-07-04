let gulp = require('gulp'),
    minifyCss = require('gulp-clean-css'), //压缩css
    connect = require('gulp-connect'), //启动微型服务器
    concat = require('gulp-concat'), //合并文件
    uglify = require('gulp-uglify'), //压缩js
    runSequence = require("run-sequence").use(gulp), //同步执行gulp任务
    shell = require('gulp-shell'),//gulp控制执行shell命令
    homePage = "./public/demo.html",//文件改动后刷新的页面
    root = './',//启动服务器后的根目录
    modules = ["core", "demo", "iposs", "iposs_sd", "iposs_ah"],//涉及监控的项目文件夹名
    ready = modules.map(i => i + '-ready');//执行gulp ready任务时执行的任务名集合

//根据项目文件名建立对应的webpack开发状态任务
modules.forEach(name => gulp.task(name, shell.task(['cross-env NODE_ENV=dev webpack --config ./webpack/' + name + '.js'])));
//根据项目文件名建立对应的带source-map的webpack编译任务
modules.forEach(name => gulp.task(name + '-ready', shell.task(['cross-env NODE_ENV=ready webpack --config ./webpack/' + name + '.js'])));
//gulp默认任务 命令行输入 gulp后执行的任务
gulp.task('default', ['watch', 'serve']);
//监视文件任务
gulp.task('watch', function () {
    gulp.watch(homePage, ['reload']);
    modules.forEach(name => {
        //注册对应项目的开发编译任务
        gulp.task(name + '-build', callback => {
            //先执行编译任务后刷新页面
            runSequence(name, "reload", callback)
        });
        //监视对应项目文件夹下的js css html类文件,发现改动则启动对应编译任务
        gulp.watch(name + '/**/*.{js,css,html}', [name + '-build']);
    });
});
//启动项目微服务器
gulp.task('serve', () => connect.server({
    root: root,
    port: 3000,
    livereload: true
}));
//执行页面刷新
gulp.task('reload', () => gulp.src(homePage).pipe(connect.reload()));

//------------------------------
//一步执行完所有编译任务,带source-map方便开发debug
gulp.task('dev', modules);
//顺序执行部署任务,先全部部署状态编译,后合并文件任务
gulp.task('ready', function (callback) {
    runSequence('webpack-ready', "concat-files", callback);
});
gulp.task('debugger', function (callback) {
    runSequence('dev', "concat-files", callback);
});
gulp.task('webpack-ready', ready);


//文件合并任务,将核心模块和项目模块合并成单一的css和js
var distPath = "./dist/";
gulp.task("concat-files", function () {
    cocatFiles(
        ['./public/topo/core.css', './public/topo/iposs.css'],
        ['./public/topo/core.js', './public/topo/iposs.js'],
        distPath + "topo"
    );
    gulp.src("./iposs/menu.json").pipe(gulp.dest(distPath + 'topo/'));

    cocatFiles(
        ['./public/topo/core.css', './public/topo/iposs_sd.css'],
        ['./public/topo/core.js', './public/topo/iposs_sd.js'],
        distPath + "topo_sd"
    );
    gulp.src("./iposs_sd/menu.json").pipe(gulp.dest(distPath + 'topo_sd/'));


    cocatFiles(
        ['./public/topo/core.css', './public/topo/iposs_ah.css'],
        ['./public/topo/core.js', './public/topo/iposs_ah.js'],
        distPath + "topo_ah"
    );
    gulp.src("./iposs_ah/menu.json").pipe(gulp.dest(distPath + 'topo_ah/'));
});

function cocatFiles(css, js, path) {

    gulp.src(css) //- 需要处理的css文件，放到一个字符串数组里
        .pipe(concat('topo.min.css')) //- 合并后的文件名
        .pipe(minifyCss()) //- 压缩处理成一行
        .pipe(gulp.dest(path));

    gulp.src(js)
        .pipe(concat('topo.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest(path));
}