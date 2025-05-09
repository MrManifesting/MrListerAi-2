{pkgs}: {
  deps = [
    pkgs.python311Packages.openai
    pkgs.rPackages.openaistream
  ];
}
