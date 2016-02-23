module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-browserify');

    grunt.registerTask('dev', ['browserify:dev']);
    grunt.registerTask('dist', ['browserify:release', 'uglify:release']);
    grunt.registerTask('uglying', ['uglify:release']);

    var browserifyFiles = {'scripts/bundle.js':['scripts/main.js']};
    var uglifyFiles = {'./scripts/bundle-min.js':['./scripts/bundle.js']};
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        browserify: {
            dev: {
                options:{debug: true},
                files: browserifyFiles
            },
            release:{
                options:{debug:false},
                files: browserifyFiles
            }
        },
        watch: {
            files: ['scripts/*', 'scripts/*/*'],
            tasks: ['browserify:dev']
        }
    });
}
