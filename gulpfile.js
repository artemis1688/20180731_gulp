//將gulp的工具導入(之後可以用文件快速產生這些內容)
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
// 可將下方的gulp套件註解掉，因為gulp-load-plugins會自動執行gulp-*開頭的套件，所以下方可直接註解掉即可
// var jade = require('gulp-jade');
// var sass = require('gulp-sass');
// var plumber = require('gulp-plumber');
// var postcss = require('gulp-postcss');
// 下方autoprefixer非gulp-*的套件，所以要保留
var autoprefixer = require('autoprefixer');
var mainBowerFiles = require('main-bower-files');
var browserSync = require('browser-sync').create();
var minimist = require('minimist');
var gulpSequence = require('gulp-sequence');


//宣告一個環境選項
var envOptions = {
	string: 'env',
	default: {
		//預設是develop這個環境
		env: 'develop'
	}
}
var options = minimist(process.argv.slice(2), envOptions)
console.log(options)

gulp.task('clean', function () {
	return gulp.src(['./.tmp', './public'], { read: false })
		.pipe($.clean());
});

// 定義一個任務，及任務名稱
gulp.task('copyHTML', function () {
	// 任務內容，及資料來源
	return gulp.src('./source/**/*.html')
		// 輸出到'目的地'
		.pipe(gulp.dest('./public/'))
})

// 以下針對gulp的套件(jade、sass)的.pipe內容直接加入$
gulp.task('jade', function () {
	gulp.src('./source/*.jade')
		.pipe($.plumber())
		.pipe($.jade({
			// 讓HTML容易閱讀，若要壓縮HTML可以註解掉
			pretty: true
		}))
		.pipe(gulp.dest('./public/'))
		.pipe(browserSync.stream())
});


gulp.task('sass', function () {
	var plugins = [
		autoprefixer({ browsers: ['last 3 version', '>5%', 'ie 6'] })
	];
	return gulp.src('./source/sass/**/*.sass')
		.pipe($.plumber())
		.pipe($.sourcemaps.init())
		.pipe($.sass().on('error', $.sass.logError))
		// 編譯完成css
		.pipe($.postcss(plugins))
		//幫css壓縮
		.pipe($.if(options.env === 'production', $.minifyCss()))
		.pipe($.sourcemaps.write('.'))
		.pipe(gulp.dest('./public/css'))
		.pipe(browserSync.stream())
});


gulp.task('babel', () =>
	gulp.src('./source/js/**/*.js')
		.pipe($.plumber())
		.pipe($.sourcemaps.init())
		.pipe($.concat('all.js'))
		.pipe($.babel({
			presets: ['es2017-node7']
		}))
		幫js壓縮
		.pipe($.if(options.env === 'production', $.uglify({
			compress: {
				drop_console: true
			}
		})))
		.pipe($.sourcemaps.write('.'))
		.pipe(gulp.dest('./public/js'))
		.pipe(browserSync.stream())

);

gulp.task('bower', function () {
	return gulp.src(mainBowerFiles({
		"overrides": {
			"vue": {                       // 套件名稱
				"main": "dist/vue.js"      // 取用的資料夾路徑
			}
		}
	}))
		.pipe(gulp.dest('./.tmp/vendors'))
});

// 成立一個vendorJs的任務，專門處理bower下載下來存在.temp中後,合併到public中的資料匣，專門處理外部載入的js檔案
// 在vendorJs中加入['bower']的任務，意思是先執行bower任務，再執行vendorJs任務
gulp.task('vendorJs', ['bower'], function () {
	// 資料來源
	return gulp.src('./.tmp/vendors/**/**.js')
		.pipe($.order([
			'vue.js',
			'jquery.js',
			'bootstrap.js'
		]))
		// 合併到vendors.js這個檔案去
		.pipe($.concat('vendors.js'))
		//bower輸出也要加入語法
		.pipe($.if(options.env === 'production', $.uglify()))
		// 輸出到目的地
		.pipe(gulp.dest('./public/js'))
})

gulp.task('browser-sync', function () {
	browserSync.init({
		server: {
			baseDir: "./public"
		},
		reloadDebounce: 2000
	});
});

gulp.task('watch', function () {
	// 監控的目標，及執行的任務名稱
	gulp.watch('./source/sass/**/*.sass', ['sass']);
	gulp.watch('./source/*.jade', ['jade']);
	gulp.watch('./source/js/**/*.js', ['babel']);
});

gulp.task('image-min', () =>
	gulp.src('./source/images/*')
		.pipe($.if(options.env === 'production', $.imagemin()))
		.pipe(gulp.dest('./public/images'))
);

gulp.task('deploy', function () {
	return gulp.src('./public/**/*')
		.pipe($.ghPages());
});

//將gulp-clean、gulp合併成一個流程build，此為發布用的流程
gulp.task('build', gulpSequence('clean', 'jade', 'sass', 'babel', 'vendorJs', 'image-min'));
// 刪除bower任務，因為在vendorJs中，已先執行bower任務了
gulp.task('default', ['jade', 'sass', 'babel', 'vendorJs', 'browser-sync', 'image-min', 'watch']);