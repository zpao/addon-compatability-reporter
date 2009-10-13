#!/bin/sh

mkdir -p chrome;
[ -f acr.xpi ] && rm acr.xpi;
[ -f chrome/acr.jar ] && rm chrome/acr.jar;
zip -r0 acr.jar content locale skin -x \*.svn/* -x \*.zip -x \*.db -x \*.xcf -x \*.\*~ -x \*.DS_Store;
mv acr.jar chrome/
zip -r9 acr.xpi chrome.manifest install.rdf defaults/ chrome/ components/ -x \*.svn/* -x \*.DS_Store;
printf "ACR build finished.\n";
