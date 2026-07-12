from wiki.sources import sources


def test_recording_layer_registered():
    layers = {name for name, _ in sources()}
    assert "recording" in layers
