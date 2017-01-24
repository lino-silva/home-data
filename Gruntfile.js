'use strict';

module.exports = (grunt) => {
  require('matchdep').filterDev('grunt-!(cli)').forEach(grunt.loadNpmTasks);

  grunt.initConfig({
    less: {
      dev: {
        options: {
          sourceMap: true,
          sourceMapFilename: 'public/css/style.map'
        },
        files: {
          'public/css/style.css': 'less/style.less'
        }
      }
    },
    watch: {
      all: {
        files: ['less/**/*.less'],
        tasks: ['less'],
      }
    }
  });

  grunt.registerTask('default', ['less', 'watch']);
};