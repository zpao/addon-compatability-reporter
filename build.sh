#!/bin/sh

[ -f acr.xpi ] && rm acr.xpi;
zip -r9 acr.xpi chrome.manifest install.rdf defaults/ chrome/ components/ -x \*.svn/* -x \*.DS_Store -x \*.swp;
printf "ACR build finished.\n";
