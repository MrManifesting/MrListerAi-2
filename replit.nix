{pkgs}: {
  deps = [
    pkgs.haskellPackages.openai-servant-gen
    pkgs.python312Packages.openaiauth
    pkgs.openai-triton-llvm
    pkgs.python311Packages.openai
    pkgs.rPackages.openaistream
  ];
}
