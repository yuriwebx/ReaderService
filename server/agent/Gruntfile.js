/*global module: false*/
module.exports = function (grunt) {
   'use strict';

   grunt.initConfig({
      pkg    : grunt.file.readJSON('package.json'),
      jshint : {
         options : {
            jshintrc : '.jshintrc'
         },
         server  : [
            '*.js', './lib/**/*.js'
         ]
      },
      jscs   : {
         server  : ['*.js', './lib/**/*.js'],
         options : {
            config : "../../build/.jscs.json"
         }
      }
   });

   grunt.loadNpmTasks('grunt-contrib-jshint');
   grunt.loadNpmTasks("grunt-jscs-checker");

   grunt.registerTask('verify', ['jshint:server', 'jscs:server']);
   grunt.registerTask('build', ['verify']);
   grunt.registerTask('default', ['build']);
};