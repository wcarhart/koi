class Koi < Formula
  desc "Bashful argument parsing"
  homepage "https://github.com/wcarhart/koi"
  license "MIT"
  head "https://github.com/wcarhart/koi.git"

  depends_on "bash"

  def install
    inreplace "bin/koi", "#!/usr/bin/env bash", "#!#{formula_opt_bin("bash")}/bash"
    inreplace "bin/koi", "@KOI_LIBRARY@", "#{opt_prefix}/share/koi/koi"
    pkgshare.install "koi"
    bin.install "bin/koi"
  end

  test do
    (testpath/"example.sh").write <<~BASH
      source "#{pkgshare}/koi"
      __addcommand demo --function demo --description "Demo command"
      demo() { echo "handler should not run"; }
      __koirun "$@"
    BASH
    assert_equal "demo\n",
                 shell_output("#{formula_opt_bin("bash")}/bash #{testpath}/example.sh")
  end
end
