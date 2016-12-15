/*global module: false*/
module.exports = function (grunt) {
   'use strict';

   grunt.initConfig({
      pkg    : grunt.file.readJSON('package.json'),
      jshint : {
         options : {
            jshintrc : '../build/ci.jshintrc'
         },
         server  : ['./*.js','./rest/*.js','./search/*.js','./serverScripts/*.js' , './mail/*.js'
         ]
      },
      jscs   : {
         server  : ['./*.js', './rest/*.js','./search/*.js','./serverScripts/*.js', './mail/*.js'],
         options : {
            config : "../build/.jscs.json"
         }
      }
   });

   grunt.loadNpmTasks('grunt-contrib-jshint');
   grunt.loadNpmTasks("grunt-jscs-checker");

   grunt.registerTask('jshint', ['jshint:server']);
   grunt.registerTask('verify', ['jshint:server', 'jscs:server']);
   grunt.registerTask('build', ['verify']);
   grunt.registerTask('default', ['build']);
};